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
app.debug = True

# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/test.db'

db = SQLAlchemy(app)
   
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
                'demand': self.demand,
                'head': self.head,
                'node_type': self.node_type,
                'x': self.x,
                'y': self.y,
                'pressure': self.pressure,
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
    network_id = Column(Integer, ForeignKey('network.id'))

    def __init__(self, edge_id, head_id, tail_id, length, diameter, roughness, edge_type, flow, network):
        self.edge_id = edge_id
        self.head_id = head_id
        self.tail_id = tail_id
        self.length = length
        self.diameter = diameter
        self.roughness = roughness
        self.edge_type = edge_type
        self.flow = flow
        self.network = network

    @property
    def serialize(self):
        return {'edge_id': self.edge_id,
                'head_id': self.head_id,
                'tail_id': self.tail_id,
                'length': self.length,
                'diameter': self.diameter,
                'roughness': self.roughness,
                'edge_type': self.edge_type,
                'flow': self.flow,
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
                    network)
        db.session.add(edge)
    db.session.commit()

def create_network(name):
    print("Network name: %s" % name)
    
    network = Network(name)
    db.session.add(network) 
    db.session.commit()

    # Read info from .inp file
    print("Read inp file ....");
    file = open(name, 'r')
    nodes, edges, pump_curves = read_inp(file)

    # Get all variables from the network
    print("Extract variables ....");
    A_orig, L = extract_var_edges(edges, len(nodes))    
    d, hc = extract_var_nodes(nodes)   
    dh_max, L_pump, pump_head_list = extract_var_pumps(pump_curves, L)    

    # Save varibles locally
    print("Save varibles ....");
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
    print("Insert database ....");    
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

    tic = time.clock()  
    create_network('Big.inp')
    toc = time.clock()
    print('Big use time: %f' % (toc-tic))

    db.session.commit()

# shutil.rmtree(DATA_FOLDER)
# db.drop_all()
# create_database()

@app.route('/api/predirection/<network_id>')
def get_predirection(network_id):
    network = Network.query.filter_by(id=network_id).first()
    edges = Edge.query.filter(Edge.network.has(id=network_id))  

    A_orig = load_var(network, 'A_orig')  
    L = load_var(network, 'L')
    d = load_var(network, 'd')

    obj, A_pred, flip = predirection(A_orig, L, d)

    save_var(network, 'A', A_pred)
    save_var(network, 'L', L)
    save_var(network, 'd', d)

    for i in flip:
        edges[i].head_id, edges[i].tail_id = edges[i].tail_id, edges[i].head_id

    return jsonify(json_list = [edge.direction for edge in edges])

@app.route('/api/max_flow/<network_id>')
def get_max_flow(network_id):
    network = Network.query.filter_by(id=network_id).first()
    A = load_var(network, 'A')  
    L_pump = load_var(network, 'L_pump')
    dh_max = load_var(network, 'dh_max')
    d = load_var(network, 'd')
    h = load_var(network, 'h')
    obj_flow, q = solve_max_flow(A, L_pump, dh_max, d, h)
    save_var(network, 'q', q)
    edges = []
    for i, item in enumerate(q):
        edge = {'edge_id': i + 1, 'flow': item.tolist()[0][0]}
        edges.append(edge)
    return jsonify(obj_flow=obj_flow, edges=edges) 

@app.route('/api/imaginary_flow/<network_id>')
def get_imaginary_flow(network_id):
    network = Network.query.filter_by(id=network_id).first()
    A = load_var(network, 'A')  
    L_pump = load_var(network, 'L_pump')
    dh_max = load_var(network, 'dh_max')
    d = load_var(network, 'd')
    obj_flow, q = solve_imaginary_flow(A, L_pump, dh_max, d)
    save_var(network, 'q', q)
    edges = []
    for i, item in enumerate(q):
        edge = {'edge_id': i + 1, 'flow': item.tolist()[0][0]}
        edges.append(edge)
    return jsonify(obj_flow=obj_flow, edges=edges)    

@app.route('/api/imaginary_pressure/<network_id>')
def get_imaginary_pressure(network_id):
    network = Network.query.filter_by(id=network_id).first()
    A = load_var(network, 'A')  
    L_pump = load_var(network, 'L_pump')
    dh_max = load_var(network, 'dh_max')
    hc = load_var(network, 'hc')
    pump_head_list = load_var(network, 'pump_head_list')    
    q = load_var(network, 'q')
    obj_pressure, h = solve_imaginary_pressure(A, L_pump, dh_max, hc, pump_head_list, q)
    save_var(network, 'h', h)
    nodes = []
    for i, item in enumerate(h):
        node = {'node_id': i + 1, 'pressure': item.tolist()[0][0]}
        nodes.append(node)
    return jsonify(obj_pressure=obj_pressure, nodes=nodes)   

@app.route('/api/imaginary/<network_id>')
def get_imaginary_flow_and_pressure(network_id):
    network = Network.query.filter_by(id=network_id).first()
    A = load_var(network, 'A')  
    L_pump = load_var(network, 'L_pump')
    dh_max = load_var(network, 'dh_max')
    d = load_var(network, 'd')
    hc = load_var(network, 'hc')
    pump_head_list = load_var(network, 'pump_head_list')    
    obj_flow, q = solve_imaginary_flow(A, L_pump, dh_max, d)
    obj_pressure, h = solve_imaginary_pressure(A, L_pump, dh_max, hc, pump_head_list, q)
    save_var(network, 'q', q)
    save_var(network, 'h', h)

    edges_data = Edge.query.all()
    edges = []
    for i, item in enumerate(q):
        flow = item.tolist()[0][0]
        edge = {'edge_id': i + 1, 'flow': flow}
        edges_data[i].flow = flow
        edges.append(edge)

    nodes_data = Node.query.all()
    nodes = []
    for i, item in enumerate(h):
        pressure = item.tolist()[0][0];
        node = {'node_id': i + 1, 'pressure': pressure}
        nodes_data[i].pressure = pressure
        nodes.append(node)
    db.session.commit()
    return jsonify(obj_flow=obj_flow, obj_pressure=obj_pressure, nodes=nodes, edges=edges) 

@app.route('/api/iter/<network_id>/<iter>')
def get_iterative(network_id, iter):
    iter = int(iter)
    network = Network.query.filter_by(id=network_id).first()
    A = load_var(network, 'A')  
    L_pump = load_var(network, 'L_pump')
    dh_max = load_var(network, 'dh_max')
    d = load_var(network, 'd')
    hc = load_var(network, 'hc')
    pump_head_list = load_var(network, 'pump_head_list')    
    q = load_var(network, 'q')

    gap = []
    energy_loss = []
    energy_pump= []

    for i in range(iter):
        obj_pressure, h = solve_imaginary_pressure(A, L_pump, dh_max, hc, pump_head_list, q)
        obj_flow, q = solve_max_flow(A, L_pump, dh_max, d, h)
        gap.append(obj_pressure)
        energy_pump_tmp = dh_max.T*q - L_pump[dh_max > 0].T*np.power(q[dh_max > 0],3).T
        energy_pump.append(energy_pump_tmp.item())

        energy_loss_tmp = L_pump.T*np.power(q,3) - L_pump[dh_max > 0].T*np.power(q[dh_max > 0],3).T
        energy_loss.append(energy_loss_tmp.item())

    save_var(network, 'q', q)
    save_var(network, 'h', h)

    edges_data = Edge.query.all()
    edges = []
    for i, item in enumerate(q):
        flow = item.tolist()[0][0]
        edge = {'edge_id': i + 1, 'flow': flow}
        edges_data[i].flow = flow
        edges.append(edge)

    nodes_data = Node.query.all()
    nodes = []
    for i, item in enumerate(h):
        pressure = item.tolist()[0][0];
        node = {'node_id': i + 1, 'pressure': pressure}
        nodes_data[i].pressure = pressure
        nodes.append(node)
    db.session.commit()

    return jsonify(gap=gap, energy_loss=energy_loss, energy_pump=energy_pump, nodes=nodes, edges=edges) 

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/pump_curve')
def pump_curve():
    return render_template("pump_curve.html")

@app.route('/api/nodes/<network>')
def get_nodes(network):
    nodes = Node.query.filter(Node.network.has(id=network))
    return jsonify(json_list = [node.serialize for node in nodes])

@app.route('/api/nodes/<network_id>/<node_id>')
def get_node(network_id, node_id):
    nodes = Node.query.filter(Node.network.has(id=network_id) & (Node.node_id == node_id))
    return jsonify(json_list = [node.serialize for node in nodes])

@app.route('/api/summary/<network_id>')
def get_summary(network_id):
    nodes = Node.query.filter(Node.network.has(id=network_id))
    edges = Edge.query.filter(Edge.network.has(id=network_id))
    name = Network.query.filter_by(id=network_id).first().name    
    num_node = nodes.count()
    num_edge = edges.count()
    num_customer = nodes.filter(Node.node_type == 1).count()
    num_source = nodes.filter(Node.node_type == 2).count()
    num_tank = nodes.filter(Node.node_type == 3).count()
    num_pump = edges.filter(Edge.edge_type == 1).count()
    num_valve = edges.filter(Edge.edge_type == 2).count()    
    output = {'name': name, 
              'num_node': num_node,
              'num_edge': num_edge,
              'num_customer': num_customer,
              'num_source': num_source,
              'num_tank': num_tank,
              'num_pump': num_pump,
              'num_valve': num_valve}
    return jsonify(output)


@app.route('/api/edges/<network>')
def get_edges(network):
    edges = Edge.query.filter(Edge.network.has(id=network))  
    return jsonify(json_list = [edge.serialize for edge in edges])

@app.route('/api/edges/<network_id>/<edge_id>')
def get_edge(network_id, edge_id):
    edges = Edge.query.filter(Edge.network.has(id=network_id) & (Edge.edge_id == edge_id))  
    return jsonify(json_list = [edge.serialize for edge in edges])

@app.route('/api/networks')
def get_networks():
    networks = Network.query.all()
    return jsonify(json_list = [network.serialize for network in networks])

@app.route('/api/pumps/<network>')
def get_pumps(network):    
    pumps = Pump.query.filter(Pump.network.has(id=network))  
    return jsonify(json_list = [pump.serialize for pump in pumps])

@app.route('/api/pumps/<network>/<pump_id>')
def get_pump(network, pump_id):
    print(pump_id)
    pumps = Pump.query.filter(Pump.network.has(id=network) & (Pump.pump_id == pump_id))  
    return jsonify(json_list = [pump.serialize for pump in pumps])

@app.route('/api/cvx')
def getget():
    m = 20
    n = 10
    p = 4
    A = np.random.rand(m,n)
    b = np.random.rand(m,1)
    C = np.random.rand(p,n); 
    d = np.random.rand(p,1); 
    e = np.random.rand(1);
    x = Variable(n,1)
    constraints = [C*x == d, norm( x, float('Inf') ) <= e]
    obj = Minimize( norm( A * x - b, 2 ) )
    prob=Problem(obj, constraints)
    prob.solve(verbose=True, solver=MOSEK)
    print(obj.value)
    return str(prob.value)

@app.route('/api/customers_table_info/<network>')
def get_customers_table_info(network):
    customers_nodes = Node.query.filter(Node.network.has(id = network) & (Node.node_type == 1))
    network = Network.query.filter_by(id=network).first()
    A = load_var(network, 'A')
    num_v = A.shape[0]
    num_e = A.shape[1]
    A = np.asmatrix(A)
    
    q = load_var(network, 'q')
    q = np.asmatrix(q)
    hc = load_var(network, 'hc')
    h = load_var(network, 'h')
    d = load_var(network, 'd')
    flow_in = []
    flow_satisfied = []
    pressure_satisfied = []
    pressure = []
    for customers_node in customers_nodes:
        flow_in_mat=np.asarray(A[customers_node.node_id-1,:]*q)
        flow_in.append(float(flow_in_mat))
        if A[customers_node.node_id-1,0:num_e]*q < d[customers_node.node_id-1]:
            flow_satisfied.append(1)
        else:
            flow_satisfied.append(0)
        pressure.append(float(h[customers_node.node_id-1]))
        if h[customers_node.node_id-1] > hc[customers_node.node_id-1]:
            pressure_satisfied.append(1)
        else:
            pressure_satisfied.append(0)
    return jsonify(customers_nodes_list = [{'node_id': customers_node.node_id,
                                            'demand': customers_node.demand,
                                            'flow_in':float("{0:.2f}".format(flow_in[i]*(-1000))),                                            
                                            'flow_satisfied': flow_satisfied[i],
                                            'pressure_satisfied': pressure_satisfied[i],
                                            'pressure': float("{0:.2f}".format(pressure[i])),
                                            'min_pressure': customers_node.head
                                            } for i, customers_node in enumerate(customers_nodes)])
 
@app.route('/api/sources_table_info/<network>')
def get_sources_table_info(network):
    sources_nodes = Node.query.filter(Node.network.has(id = network) & (Node.node_type == 2))
    network = Network.query.filter_by(id=network).first()
    A = load_var(network, 'A')
    num_v = A.shape[0]
    num_e = A.shape[1]
    A = np.asmatrix(A)
    
    q = load_var(network, 'q')
    q = np.asmatrix(q)
    hc = load_var(network, 'hc')
    h = load_var(network, 'h')
    d = load_var(network, 'd')
    flow_out = []
    pressure = []
    for sources_node in sources_nodes:
        flow_out_mat=np.asarray(A[sources_node.node_id-1,:]*q)
        flow_out.append(float(flow_out_mat))
        pressure.append(float(h[sources_node.node_id-1]))
    return jsonify(sources_nodes_list = [{'node_id': sources_node.node_id,
                                            'flow_out':float("{0:.2f}".format(flow_out[i]*(1000))),                                            
                                            'pressure': float("{0:.2f}".format(pressure[i])),
                                            'min_pressure': sources_node.head
                                            } for i, sources_node in enumerate(sources_nodes)])
    

@app.route('/api/pumps_table_info/<network>')    
def get_pumps_table_info(network):
    pumps_edges = Pump.query.filter(Pump.network.has(id = network))
    return jsonify(pumps_edges_list = [pumps_edge.serialize for pumps_edge in pumps_edges])

@app.route('/api/valves_table_info/<network>')    
def get_valves_table_info(network):
    valves_edges = Edge.query.filter(Edge.network.has(id = network) & (Edge.edge_type == 2))
    valve_status=[]
    valve_flow=[]
    network = Network.query.filter_by(id=network).first()
    q = load_var(network, 'q')  
    for valves_edge in valves_edges:
        if q[valves_edge.edge_id-1] > 0:
            valve_status.append(1)
            valve_flow.append(float(q[valves_edge.edge_id-1]))
        else:
            valve_status.append(0)
            valve_flow.append(float(q[valves_edge.edge_id-1]))
    return jsonify(valves_edges_list = [{'edge_id': valves_edge.edge_id, 
                                         'head_id': valves_edge.head_id,
                                         'tail_id': valves_edge.tail_id,
                                         'valve_status': valve_status[i],
                                         'valve_flow': float("{0:.2f}".format(valve_flow[i]))} for i, valves_edge in enumerate(valves_edges)])    
    
    
@app.route('/api/five_highest_pressure/<network>')
def get_five_highest_pressure_nodes(network):
    five_highest_pressure_nodes = Node.query.order_by(Node.pressure.desc()).limit(5)    
    return jsonify(json_list = [five_highest_pressure_node.serialize for five_highest_pressure_node in five_highest_pressure_nodes])
    
@app.route('/api/five_lowest_pressure/<network>')
def get_five_lowest_pressure_nodes(network):
    five_lowest_pressure_nodes = Node.query.order_by(Node.pressure.asc()).limit(5)    
    return jsonify(json_list = [five_lowest_pressure_node.serialize for five_lowest_pressure_node in five_lowest_pressure_nodes])

@app.route('/api/five_highest_flow/<network>')
def get_five_highest_flow_edes(network):
    five_highest_flow_edges = Edge.query.order_by(Edge.flow.desc()).limit(5)    
    return jsonify(json_list = [five_highest_flow_edge.serialize for five_highest_flow_edge in five_highest_flow_edges])
    
@app.route('/api/five_lowest_flow/<network>')
def get_five_lowest_flow_edes(network):
    five_lowest_flow_edges = Edge.query.order_by(Edge.flow.asc()).limit(5)    
    return jsonify(json_list = [five_lowest_flow_edge.serialize for five_lowest_flow_edge in five_lowest_flow_edges])


if __name__ == "__main__":
    app.run()    

