from flask import Flask, request, jsonify, render_template
import numpy as np
import itertools
import random

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/run_aco', methods=['POST'])
def run_aco():
    data = request.get_json()
    num_cities = int(data['num_cities'])
    num_ants = int(data['num_ants'])
    num_iterations = int(data['num_iterations'])

    # Generate random cities
    city_coords = np.random.rand(num_cities, 2) * 100
    dist_matrix = np.sqrt(
        (np.square(city_coords[:, np.newaxis] - city_coords).sum(axis=2)))

    # ACO Parameters
    pheromone_evaporation_rate = 0.1
    alpha = 1
    beta = 2
    pheromone_matrix = np.ones((num_cities, num_cities))

    def distance(city1, city2):
        return dist_matrix[city1, city2]

    def calculate_probabilities(current_city, visited):
        pheromones = pheromone_matrix[current_city, :]
        desirability = (1 / (dist_matrix[current_city, :] + 1e-10)) ** beta
        desirability[visited] = 0
        probability = pheromones ** alpha * desirability
        probability /= probability.sum()
        return probability

    def construct_tour():
        tour = [random.randint(0, num_cities - 1)]
        for _ in range(num_cities - 1):
            probabilities = calculate_probabilities(tour[-1], tour)
            next_city = np.random.choice(range(num_cities), p=probabilities)
            tour.append(next_city)
        return tour

    def update_pheromones(ant_tours):
        nonlocal pheromone_matrix
        pheromone_matrix *= (1 - pheromone_evaporation_rate)
        for tour in ant_tours:
            tour_length = sum(distance(
                tour[i], tour[i + 1]) for i in range(num_cities - 1)) + distance(tour[-1], tour[0])
            for i in range(num_cities - 1):
                pheromone_matrix[tour[i], tour[i + 1]] += 1 / tour_length
                pheromone_matrix[tour[i + 1], tour[i]] += 1 / tour_length
            pheromone_matrix[tour[-1], tour[0]] += 1 / tour_length
            pheromone_matrix[tour[0], tour[-1]] += 1 / tour_length

    # ACO Implementation
    best_tour = None
    best_length = float('inf')

    for iteration in range(num_iterations):
        ant_tours = [construct_tour() for _ in range(num_ants)]
        for tour in ant_tours:
            tour_length = sum(distance(
                tour[i], tour[i + 1]) for i in range(num_cities - 1)) + distance(tour[-1], tour[0])
            if tour_length < best_length:
                best_length = tour_length
                best_tour = tour
        update_pheromones(ant_tours)

    best_tour_coords = city_coords[best_tour + [best_tour[0]], :].tolist()

    # Nearest Neighbor Algorithm
    def nearest_neighbor(dist_matrix):
        path = [0]  # Starting from city 0
        visited = set(path)

        while len(path) < num_cities:
            current_city = path[-1]
            next_city = min([(dist_matrix[current_city, j], j)
                            for j in range(num_cities) if j not in visited])[1]
            path.append(next_city)
            visited.add(next_city)

        return path, calculate_path_length(path, dist_matrix)

    def calculate_path_length(path, dist_matrix):
        return sum(distance(path[i], path[i + 1]) for i in range(len(path) - 1)) + distance(path[-1], path[0])

    nn_path, nn_length = nearest_neighbor(dist_matrix)
    nn_path_coords = city_coords[nn_path + [nn_path[0]], :].tolist()

    # Exhaustive Search for small problems
    if num_cities <= 10:
        all_permutations = itertools.permutations(range(num_cities))
        exhaustive_best_path = None
        exhaustive_best_length = float('inf')

        for perm in all_permutations:
            current_length = calculate_path_length(perm, dist_matrix)
            if current_length < exhaustive_best_length:
                exhaustive_best_length = current_length
                exhaustive_best_path = perm

        exhaustive_path_coords = city_coords[list(
            exhaustive_best_path) + [exhaustive_best_path[0]], :].tolist()
    else:
        exhaustive_path_coords = []
        exhaustive_best_length = None

    # Determine the shortest path among the algorithms
    shortest_length = min(best_length, nn_length,
                          exhaustive_best_length if exhaustive_best_length is not None else float('inf'))
    shortest_method = 'ACO' if shortest_length == best_length else 'Nearest Neighbor' if shortest_length == nn_length else 'Exhaustive Search'

    return jsonify({
        'city_coords': city_coords.tolist(),
        'best_tour': best_tour_coords,
        'best_length': best_length,
        'nn_path': nn_path_coords,
        'nn_length': nn_length,
        'exhaustive_path': exhaustive_path_coords,
        'exhaustive_length': exhaustive_best_length,
        'shortest_method': shortest_method,
        'shortest_length': shortest_length
    })


if __name__ == '__main__':
    app.run(debug=True)
