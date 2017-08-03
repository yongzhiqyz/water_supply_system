import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, func
from sqlalchemy.orm import relationship, backref
from sqlalchemy.types import PickleType

from werkzeug import secure_filename
import json
import time
import io
import sqlite3
import numpy as np
import shutil
from cvxpy import *

from io_handler import *
from solve_handler import *

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(APP_ROOT, 'data')

app = Flask(__name__)
CORS(app)

# ==================== CONFIG ====================
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/test.db'

JUNCTION = 0
CUSTOMER = 1
SOURCE = 2
TANK = 3

PIPE = 0
PUMP = 1
VALVE = 2
EPS = 1e-2

# ==================== Database Class ====================
db = SQLAlchemy(app)


class Node(db.Model):
    __tablename__ = 'node'
    id = Column(Integer, primary_key=True)
    node_id = Column(Integer)
    node_name = Column(String)
    demand = Column(Float)
    head = Column(Float)
    node_type = Column(Integer)
    x = Column(Float)
    y = Column(Float)
    pressure = Column(Float)
    network_id = Column(Integer, ForeignKey('network.id'))

    def __init__(self, node_id, node_name, demand, head, node_type, x, y, pressure, network):
        self.node_id = node_id
        self.node_name = node_name
        self.demand = demand
        self.head = head
        self.node_type = node_type
        self.x = x
        self.y = y
        self.pressure = pressure
        self.network = network

    @property
    def serialize(self):
        return {'node_id': self.node_id,
                'node_name': self.node_name,
                'demand': round(self.demand, 2),
                'head': self.head,
                'node_type': self.node_type,
                'x': self.x,
                'y': self.y,
                'pressure': round(self.pressure, 2),
                'network': self.network.serialize}


class Edge(db.Model):
    __tablename__ = 'edge'
    id = Column(Integer, primary_key=True)
    edge_id = Column(Integer)
    head_id = Column(Integer)
    tail_id = Column(Integer)
    length = Column(Float)
    diameter = Column(Float)
    roughness = Column(Float)
    edge_type = Column(Integer)
    flow = Column(Float)
    gap = Column(Float)
    network_id = Column(Integer, ForeignKey('network.id'))

    def __init__(self, edge_id, head_id, tail_id, length, diameter, roughness, edge_type, flow, gap, network):
        self.edge_id = edge_id
        self.head_id = head_id
        self.tail_id = tail_id
        self.length = length
        self.diameter = diameter
        self.roughness = roughness
        self.edge_type = edge_type
        self.flow = flow
        self.gap = gap
        self.network = network

    @property
    def serialize(self):
        return {'edge_id': self.edge_id,
                'head_id': self.head_id,
                'tail_id': self.tail_id,
                'length': round(self.length, 2),
                'diameter': round(self.diameter, 2),
                'roughness': round(self.roughness, 2),
                'edge_type': self.edge_type,
                'flow': round(self.flow * 1000, 2),
                'gap': round(self.gap, 2),
                'network': self.network.serialize}

    @property
    def direction(self):
        return {'edge_id': self.edge_id,
                'head_id': self.head_id,
                'tail_id': self.tail_id}


class Pump(db.Model):
    __tablename__ = 'pump'
    id = Column(Integer, primary_key=True)
    pump_id = Column(Integer)
    edge_id = Column(Integer)
    head_id = Column(Integer)
    tail_id = Column(Integer)
    x = Column(PickleType)
    y = Column(PickleType)
    coeff = Column(PickleType)
    network_id = Column(Integer, ForeignKey('network.id'))

    def __init__(self, pump_id, edge_id, head_id, tail_id, x, y, coeff, network):
        self.pump_id = pump_id
        self.edge_id = edge_id
        self.head_id = head_id
        self.tail_id = tail_id
        self.x = x
        self.y = y
        self.coeff = coeff
        self.network = network

    @property
    def serialize(self):
        return {'pump_id': self.pump_id,
                'edge_id': self.edge_id,
                'head_id': self.head_id,
                'tail_id': self.tail_id,
                'x': self.x,
                'y': self.y,
                'coeff': self.coeff,
                'network': self.network.serialize}


class Network(db.Model):
    __tablename__ = 'network'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    nodes = relationship('Node', backref='network')
    edges = relationship('Edge', backref='network')
    pumps = relationship('Pump', backref='network')

    def __init__(self, name):
        self.name = name

    @property
    def serialize(self):
        return {'id': self.id,
                'name': self.name}


# ==================== Create Database ====================
def create_pumps(network, pump_curves):
    for info in pump_curves:
        pump = Pump(info['pump_id'],
                    info['edge_id'],
                    info['head_id'],
                    info['tail_id'],
                    info['x'],
                    info['y'],
                    info['coeff'],
                    network)
        db.session.add(pump)
    db.session.commit()


def create_nodes(network, nodes):
    for info in nodes:
        node = Node(info['node_id'],
                    info['node_name'],
                    info['demand'],
                    info['head'],
                    info['node_type'],
                    info['x'],
                    info['y'],
                    info['head'],
                    network)
        db.session.add(node)
    db.session.commit()


def create_edges(network, edges):
    for info in edges:
        edge = Edge(info['edge_id'],
                    info['head_id'],
                    info['tail_id'],
                    info['length'],
                    info['diameter'],
                    info['roughness'],
                    info['edge_type'],
                    0.0,
                    0.0,
                    network)
        db.session.add(edge)
    db.session.commit()


def create_network(name):
    print("Network name: %s" % name)

    network = Network(name)
    db.session.add(network)
    db.session.commit()

    # Read info from .inp file
    print("Read inp file ....")
    file = open(name, 'r')
    nodes, edges, pump_curves = read_inp(file)

    # Get all variables from the network
    print("Extract variables ....")
    A_orig, L = extract_var_edges(edges, len(nodes))
    d, hc = extract_var_nodes(nodes)
    dh_max, L_pump, pump_head_list = extract_var_pumps(pump_curves, L)

    # Save varibles locally
    print("Save varibles ....")
    network_var_dir = get_var_dir(network)
    create_folder(network_var_dir)

    save_var(network, 'A_orig', A_orig)
    save_var(network, 'L', L)
    save_var(network, 'd', d)
    save_var(network, 'hc', hc)
    save_var(network, 'dh_max', dh_max)
    save_var(network, 'L_pump', L_pump)
    save_var(network, 'pump_head_list', pump_head_list)

    # Save nodes, edges to database
    print("Insert database ....")
    create_nodes(network, nodes)
    create_edges(network, edges)
    create_pumps(network, pump_curves)


def create_folder(folder_name):
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)


def create_database():
    db.create_all()
    create_folder(DATA_FOLDER)
    tic = time.clock()
    create_network('Small.inp')
    toc = time.clock()
    print('Small use time: %f' % (toc-tic))

#    tic = time.clock()
#    create_network('Big.inp')
#    toc = time.clock()
#    print('Big use time: %f' % (toc-tic))

    db.session.commit()

# ==================== Initialize new database ====================
# shutil.rmtree(DATA_FOLDER)
# db.drop_all()
# create_database()

# ==================== Routes ====================
# Primary routes
@app.route('/')
def index():
    return render_template("index.html")


# Solver routes
@app.route('/api/predirection/<network_id>')
def get_predirection(network_id):
    network = Network.query.filter_by(id=network_id).first()
    edges = Edge.query.filter(Edge.network.has(id=network_id))

    A = load_var(network, 'A')
    
    if A is None:
        # Load variables
        A_orig = load_var(network, 'A_orig')
        L = load_var(network, 'L')
        d = load_var(network, 'd')

        # Solve
        obj, A_pred, flip = predirection(A_orig, L, d)

        # Save to file
        save_var(network, 'A', A_pred)

        # Filp the direction to make flow feasible
        for i in flip:
            edges[i].head_id, edges[i].tail_id = edges[i].tail_id, edges[i].head_id
        db.session.commit()

    return jsonify(json_list=[edge.direction for edge in edges])


@app.route('/api/imaginary/<network_id>')
def get_imaginary_flow_and_pressure(network_id):
    network = Network.query.filter_by(id=network_id).first()
    edges_data = Edge.query.all()
    nodes_data = Node.query.all()

    # Load variables
    A = load_var(network, 'A')
    L_pump = load_var(network, 'L_pump')
    dh_max = load_var(network, 'dh_max')
    d = load_var(network, 'd')
    hc = load_var(network, 'hc')
    pump_head_list = load_var(network, 'pump_head_list')

    # Solve
    obj_flow, q = solve_imaginary_flow(A, L_pump, dh_max, d)
    obj_pressure, h, gap_edge = solve_imaginary_pressure(
        A, L_pump, dh_max, hc, pump_head_list, q)

    # Save to file
    save_var(network, 'q', q)
    save_var(network, 'h', h)

    # Update q, h, gap to database
    edges = []
    for i, item in enumerate(q):
        flow = item.tolist()[0][0]
        edge = {'edge_id': i + 1, 'flow': round(flow * 1000, 2)}
        edges_data[i].flow = flow
        edges.append(edge)

    nodes = []
    for i, item in enumerate(h):
        pressure = item.tolist()[0][0]
        node = {'node_id': i + 1, 'pressure': pressure}
        nodes_data[i].pressure = pressure
        nodes.append(node)

    for i, item in enumerate(gap_edge):
        edges_data[i].gap = item
    db.session.commit()

    return jsonify(obj_flow=obj_flow, obj_pressure=obj_pressure, nodes=nodes, edges=edges)


@app.route('/api/iter/<network_id>/<iter>')
def get_iterative(network_id, iter):
    iter = int(iter)
    network = Network.query.filter_by(id=network_id).first()
    edges_data = Edge.query.all()
    nodes_data = Node.query.all()

    # Load variables
    A = load_var(network, 'A')
    L_pump = load_var(network, 'L_pump')
    dh_max = load_var(network, 'dh_max')
    d = load_var(network, 'd')
    hc = load_var(network, 'hc')
    pump_head_list = load_var(network, 'pump_head_list')
    q = load_var(network, 'q')

    gap = []
    energy_loss = []
    energy_pump = []

    for i in range(iter):
        # Solve
        obj_pressure, h, gap_edge = solve_imaginary_pressure(
            A, L_pump, dh_max, hc, pump_head_list, q)
        obj_flow, q, gap_edge = solve_max_flow(A, L_pump, dh_max, d, h)

        # Gap
        gap.append(obj_pressure)

        # Energy pump
        energy_pump_tmp = dh_max.T*q - \
            L_pump[dh_max > 0].T*np.power(q[dh_max > 0], 3).T
        energy_pump.append(energy_pump_tmp.item())

        # Energy loss
        energy_loss_tmp = L_pump.T * \
            np.power(q, 3) - L_pump[dh_max > 0].T*np.power(q[dh_max > 0], 3).T
        energy_loss.append(energy_loss_tmp.item())

    # Save to file
    save_var(network, 'q', q)
    save_var(network, 'h', h)

    # Update q, h, gap to database
    edges = []
    for i, item in enumerate(q):
        flow = item.tolist()[0][0]
        edge = {'edge_id': i + 1, 'flow': round(flow * 1000, 2)}
        edges_data[i].flow = flow
        edges.append(edge)

    nodes = []
    for i, item in enumerate(h):
        pressure = item.tolist()[0][0]
        node = {'node_id': i + 1, 'pressure': pressure}
        nodes_data[i].pressure = pressure
        nodes.append(node)

    for i, item in enumerate(gap_edge):
        edges_data[i].gap = item
    db.session.commit()

    return jsonify(gap=gap, energy_loss=energy_loss, energy_pump=energy_pump, nodes=nodes, edges=edges)

# @app.route('/pump_curve')
# def pump_curve():
#     return render_template("pump_curve.html")

# Get Information
@app.route('/api/nodes/<network_id>')
def get_nodes(network_id):
    nodes = Node.query.filter(Node.network.has(id=network_id))
    return jsonify(json_list=[node.serialize for node in nodes])


@app.route('/api/nodes/<network_id>/<node_id>')
def get_node(network_id, node_id):
    nodes = Node.query.filter(Node.network.has(
        id=network_id) & (Node.node_id == node_id))
    return jsonify(json_list=[node.serialize for node in nodes])


@app.route('/api/edges/<network_id>')
def get_edges(network_id):
    edges = Edge.query.filter(Edge.network.has(id=network_id))
    return jsonify(json_list=[edge.serialize for edge in edges])


@app.route('/api/edges/<network_id>/<edge_id>')
def get_edge(network_id, edge_id):
    edges = Edge.query.filter(Edge.network.has(
        id=network_id) & (Edge.edge_id == edge_id))
    return jsonify(json_list=[edge.serialize for edge in edges])


@app.route('/api/pumps/<network_id>')
def get_pumps(network_id):
    pumps = Pump.query.filter(Pump.network.has(id=network_id))
    return jsonify(json_list=[pump.serialize for pump in pumps])


@app.route('/api/pumps/<network>/<pump_id>')
def get_pump(network, pump_id):
    pumps = Pump.query.filter(Pump.network.has(
        id=network) & (Pump.pump_id == pump_id))
    return jsonify(json_list=[pump.serialize for pump in pumps])


@app.route('/api/networks')
def get_networks():
    networks = Network.query.all()
    return jsonify(json_list=[network.serialize for network in networks])


# Table routes
@app.route('/api/summary_table/<network_id>')
def get_summary_table(network_id):
    nodes = Node.query.filter(Node.network.has(id=network_id))
    edges = Edge.query.filter(Edge.network.has(id=network_id))
    name = Network.query.filter_by(id=network_id).first().name
    num_node = nodes.count()
    num_edge = edges.count()
    num_customer = nodes.filter(Node.node_type == CUSTOMER).count()
    num_source = nodes.filter(Node.node_type == SOURCE).count()
    num_tank = nodes.filter(Node.node_type == TANK).count()
    num_pump = edges.filter(Edge.edge_type == PUMP).count()
    num_valve = edges.filter(Edge.edge_type == VALVE).count()
    output = {'name': name,
              'num_node': num_node,
              'num_edge': num_edge,
              'num_customer': num_customer,
              'num_source': num_source,
              'num_tank': num_tank,
              'num_pump': num_pump,
              'num_valve': num_valve}
    return jsonify(output)


@app.route('/api/customers_table/<network_id>')
def get_customers_table(network_id):
    customers_nodes = Node.query.filter(Node.network.has(
        id=network_id) & (Node.node_type == CUSTOMER))
    network = Network.query.filter_by(id=network_id).first()
    A = load_var(network, 'A')
    q = load_var(network, 'q')
    h = load_var(network, 'h')

    # Need to predirection to get A and solve imaginary flow/pressure
    # to be able to check constraint satisfaction
    if (A is not None) and (q is not None) and (h is not None):
        num_v, num_e = A.shape
        A = np.asmatrix(A)
        q = np.asmatrix(q)
        hc = load_var(network, 'hc')
        d = load_var(network, 'd')

        flow_in = []
        flow_satisfied = []

        pressure = []
        pressure_satisfied = []

        for node in customers_nodes:
            flow_in_mat = np.asarray(A[node.node_id-1, :]*q)
            flow_in.append(flow_in_mat)
            flow_satisfied.append(
                int(A[node.node_id-1, 0:num_e]*q < d[node.node_id-1]))
            pressure.append(h[node.node_id-1])
            pressure_satisfied.append(
                int(h[node.node_id-1] > hc[node.node_id-1]))

        return jsonify(json_list=[{'node_id': node.node_id,
                                   'demand': round(node.demand, 2),
                                   'flow_in': round(flow_in[i]*(-1000), 2),
                                   'flow_satisfied': flow_satisfied[i],
                                   'pressure_satisfied': pressure_satisfied[i],
                                   'pressure': round(pressure[i], 2),
                                   'min_pressure': round(node.head, 2)
                                   } for i, node in enumerate(customers_nodes)])

    return jsonify(json_list=[{'node_id': node.node_id,
                               'demand': node.demand,
                               'flow_in': round(0.0, 2),
                               'flow_satisfied': 0,
                               'pressure_satisfied': 0,
                               'pressure': round(node.pressure, 2),
                               'min_pressure': round(node.head, 2)
                               } for i, node in enumerate(customers_nodes)])


@app.route('/api/sources_table/<network_id>')
def get_sources_table(network_id):
    sources_nodes = Node.query.filter(Node.network.has(id=network_id) & (Node.node_type == SOURCE))
    network = Network.query.filter_by(id=network_id).first()
    A = load_var(network, 'A')
    q = load_var(network, 'q')
    h = load_var(network, 'h')

    # Need to predirection to get A and solve imaginary flow/pressure
    # to be able to check constraint satisfaction
    if (A is not None) and (q is not None) and (h is not None):
        num_v, num_e = A.shape
        A = np.asmatrix(A)
        q = np.asmatrix(q)
        hc = load_var(network, 'hc')
        d = load_var(network, 'd')

        flow_out = []

        pressure = []
        pressure_satisfied = []

        for node in sources_nodes:
            flow_out_mat = np.asarray(A[node.node_id-1, :]*q)
            flow_out.append(flow_out_mat)
            pressure.append(h[node.node_id-1])
            pressure_satisfied.append(int(h[node.node_id-1] >= node.head))

        return jsonify(json_list=[{'node_id': node.node_id,
                                   'flow_out': round(flow_out[i]*1000, 2),
                                   'pressure': round(pressure[i], 2),
                                   'min_pressure': round(node.head, 2),
                                   'pressure_satisfied': pressure_satisfied[i]
                                   } for i, node in enumerate(sources_nodes)])

    return jsonify(json_list=[{'node_id': node.node_id,
                               'flow_out': round(0.0, 2),
                               'pressure': round(node.pressure, 2),
                               'min_pressure': round(node.head, 2),
                               'pressure_satisfied': 0
                               } for i, node in enumerate(sources_nodes)])


@app.route('/api/valves_table/<network_id>')
def get_valves_table(network_id):
    valves_edges = Edge.query.filter(Edge.network.has(id=network_id) & (Edge.edge_type == VALVE))
    network = Network.query.filter_by(id=network_id).first()
    q = load_var(network, 'q')

    # Need to solve imaginary flow/pressure
    # to be able to check constraint satisfaction
    if q is not None:

        valve_flow = []
        valve_status = []

        for edge in valves_edges:
            valve_flow.append(q[edge.edge_id-1])
            valve_status.append(int(q[edge.edge_id-1] > 0))

        return jsonify(json_list=[{'edge_id': edge.edge_id,
                                   'head_id': edge.head_id,
                                   'tail_id': edge.tail_id,
                                   'valve_status': valve_status[i],
                                   'valve_flow': valve_flow[i][0]} for i, edge in enumerate(valves_edges)])

    return jsonify(json_list=[{'edge_id': edge.edge_id,
                               'head_id': edge.head_id,
                               'tail_id': edge.tail_id,
                               'valve_status': 0,
                               'valve_flow': round(0.0, 2)} for i, edge in enumerate(valves_edges)])


@app.route('/api/five_highest_pressure/<network_id>')
def get_five_highest_pressure_nodes(network_id):
    five_highest_pressure_nodes = Node.query.filter(Node.network.has(id=network_id)).order_by(Node.pressure.desc()).limit(5)
    return jsonify(json_list=[node.serialize for node in five_highest_pressure_nodes])


@app.route('/api/five_lowest_pressure/<network_id>')
def get_five_lowest_pressure_nodes(network_id):
    five_lowest_pressure_nodes = Node.query.filter(Node.network.has(id=network_id)).order_by(Node.pressure.asc()).limit(5)
    return jsonify(json_list=[node.serialize for node in five_lowest_pressure_nodes])


@app.route('/api/five_highest_flow/<network_id>')
def get_five_highest_flow_edes(network_id):
    five_highest_flow_edges = Edge.query.filter(Edge.network.has(id=network_id)).order_by(Edge.flow.desc()).limit(5)
    return jsonify(json_list=[five_highest_flow_edge.serialize for five_highest_flow_edge in five_highest_flow_edges])


@app.route('/api/five_lowest_flow/<network_id>')
def get_five_lowest_flow_edes(network_id):
    five_lowest_flow_edges = Edge.query.filter(Edge.network.has(id=network_id)).order_by(Edge.flow.asc()).limit(5)
    return jsonify(json_list=[five_lowest_flow_edge.serialize for five_lowest_flow_edge in five_lowest_flow_edges])

@app.route('/api/get_gap_statistics/<network_id>')
def get_gap_statistics(network_id):
	edges = Edge.query.filter(Edge.network.has(id=network_id))
	valve_num = edges.filter(Edge.edge_type == VALVE).count()
	valve_num_no_gap = edges.filter((Edge.edge_type == VALVE) & (Edge.gap < EPS)).count()
	valve_num_gap_flow_positive = edges.filter(((Edge.edge_type == VALVE) & (Edge.gap > EPS)) &(Edge.flow > EPS)).count()
	valve_num_gap_flow_zero = edges.filter(((Edge.edge_type == VALVE) & (Edge.gap > EPS)) &(Edge.flow< EPS)).count()
	
	pump_num = edges.filter(Edge.edge_type == PUMP).count()
	pump_num_no_gap = edges.filter((Edge.edge_type == PUMP) & (Edge.gap < EPS)).count()
	pump_num_gap_flow_positive = edges.filter(((Edge.edge_type == PUMP) & (Edge.gap > EPS)) &(Edge.flow > EPS)).count()
	pump_num_gap_flow_zero = edges.filter(((Edge.edge_type == PUMP) & (Edge.gap > EPS)) & (Edge.flow < EPS)).count()

	pipe_num = edges.filter(Edge.edge_type == PIPE).count()
	pipe_num_no_gap = edges.filter((Edge.edge_type == PIPE) & (Edge.gap < EPS)).count()
	pipe_num_gap_flow_positive = edges.filter(((Edge.edge_type == PIPE) & (Edge.gap > EPS)) &(Edge.flow > EPS)).count()
	pipe_num_gap_flow_zero = edges.filter(((Edge.edge_type == PIPE) & (Edge.gap > EPS)) & (Edge.flow < EPS)).count()


	valve_sumary = {'no_gap': valve_num_no_gap,
					'gap_flow_positive': valve_num_gap_flow_positive,
					'gap_flow_zero': valve_num_gap_flow_zero,
					'total_num': valve_num}
	pump_sumary = {'no_gap': pump_num_no_gap,
					'gap_flow_positive': pump_num_gap_flow_positive,
					'gap_flow_zero': pump_num_gap_flow_zero,
					'total_num': pump_num}
	pipe_sumary = {'no_gap': pipe_num_no_gap,
					'gap_flow_positive': pipe_num_gap_flow_positive,
					'gap_flow_zero': pipe_num_gap_flow_zero,
					'total_num': pipe_num}

	return jsonify(json_list = [valve_sumary, pump_sumary, pipe_sumary])



# @app.route('/api/pumps_table/<network_id>')
# def get_pumps_table(network_id):
#     pumps_edges = Pump.query.filter(Pump.network.has(id = network_id))
# return jsonify(pumps_edges_list = [pumps_edge.serialize for pumps_edge
# in pumps_edges])



if __name__ == "__main__":
	app.run()


