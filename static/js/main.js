function runACO() {
    const numCities = document.getElementById('num_cities').value;
    const numAnts = document.getElementById('num_ants').value;
    const numIterations = document.getElementById('num_iterations').value;

    fetch('/run_aco', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            num_cities: numCities,
            num_ants: numAnts,
            num_iterations: numIterations
        }),
    })
    .then(response => response.json())
    .then(data => {
        visualizeGraph(data);
        displayResults(data);
    });
}

function visualizeGraph(data) {
    const graphDiv = document.getElementById('graph');
    graphDiv.innerHTML = '';

    // Determine the dynamic size of the SVG based on the coordinates range
    const maxCoord = Math.max(...data.city_coords.flat());
    const minCoord = Math.min(...data.city_coords.flat());
    const coordRange = maxCoord - minCoord;

    // Increase the size of the SVG and margins for better spacing
    const width = Math.min(1200, coordRange * 10); // Cap at 1200px wide, scale with coordinates
    const height = Math.min(800, coordRange * 8); // Cap at 800px tall, scale with coordinates
    const margin = Math.max(100, coordRange * 2); // Larger margin for better spacing

    const svg = d3.select(graphDiv).append('svg')
        .attr('width', width + 2 * margin)
        .attr('height', height + 2 * margin)
        .style('background-color', '#ffffff'); // White background for contrast

    // Add a border to the plot
    svg.append('rect')
        .attr('x', margin / 2)
        .attr('y', margin / 2)
        .attr('width', width + margin)
        .attr('height', height + margin)
        .attr('fill', 'none')
        .attr('stroke', '#333')
        .attr('stroke-width', 2);

    // Use larger scales to space out the nodes better
    const scaleX = d3.scaleLinear()
        .domain([0, 100])
        .range([margin, width + margin]);

    const scaleY = d3.scaleLinear()
        .domain([0, 100])
        .range([margin, height + margin]);

    // Draw cities
    svg.selectAll('circle')
        .data(data.city_coords)
        .enter().append('circle')
        .attr('cx', d => scaleX(d[0]))
        .attr('cy', d => scaleY(d[1]))
        .attr('r', 10) // Larger radius for better visibility
        .attr('fill', '#ff5722') // Vibrant orange color for nodes
        .attr('stroke', '#333') // Add stroke for better distinction
        .attr('stroke-width', 2);

    // Add labels for cities (A, B, C, ...) with better spacing
    svg.selectAll('text.label')
        .data(data.city_coords)
        .enter().append('text')
        .attr('class', 'label')
        .attr('x', d => scaleX(d[0]) + 12) // Offset for better visibility
        .attr('y', d => scaleY(d[1]) - 12)
        .attr('font-size', '14px') // Larger font for labels
        .attr('font-weight', 'bold')
        .attr('fill', '#333') // Dark color for text
        .text((d, i) => String.fromCharCode(65 + i) + ` (${d[0].toFixed(1)}, ${d[1].toFixed(1)})`);

    // Define paths and colors for each algorithm
    const paths = [
        { data: data.best_tour, color: '#2196f3', label: 'ACO' }, // Blue
        { data: data.nn_path, color: '#4caf50', label: 'Nearest Neighbor' }, // Green
        { data: data.exhaustive_path, color: '#ffeb3b', label: 'Exhaustive Search' } // Yellow
    ];

    // Draw paths for each algorithm
    paths.forEach(path => {
        if (path.data.length > 0) {
            svg.selectAll(`.${path.label}`)
                .data(path.data.slice(0, -1))
                .enter().append('line')
                .attr('x1', (d, i) => scaleX(d[0]))
                .attr('y1', (d, i) => scaleY(d[1]))
                .attr('x2', (d, i) => scaleX(path.data[i + 1][0]))
                .attr('y2', (d, i) => scaleY(path.data[i + 1][1]))
                .attr('stroke', path.color)
                .attr('stroke-width', 4); // Thicker lines for better visibility

            const lastCity = path.data[path.data.length - 2];
            const firstCity = path.data[0];
            svg.append('line')
                .attr('x1', scaleX(lastCity[0]))
                .attr('y1', scaleY(lastCity[1]))
                .attr('x2', scaleX(firstCity[0]))
                .attr('y2', scaleY(firstCity[1]))
                .attr('stroke', path.color)
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', '6,6'); // Dashed line for the closing path
        }
    });

    // Add a legend with larger and colorful items
    const legendData = [
        { color: '#2196f3', label: 'ACO' },
        { color: '#4caf50', label: 'Nearest Neighbor' },
        { color: '#ffeb3b', label: 'Exhaustive Search' }
    ];

    svg.selectAll('legend')
        .data(legendData)
        .enter().append('rect')
        .attr('x', width + margin - 150) // Positioning legend near the right edge
        .attr('y', (d, i) => margin + i * 30)
        .attr('width', 20) // Larger legend boxes
        .attr('height', 20)
        .attr('fill', d => d.color);

    svg.selectAll('legend-label')
        .data(legendData)
        .enter().append('text')
        .attr('x', width + margin - 120)
        .attr('y', (d, i) => margin + i * 30 + 15)
        .attr('font-size', '14px') // Larger font for legend labels
        .attr('fill', '#333')
        .text(d => d.label);
}

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <p><strong>ACO Path Length:</strong> ${data.best_length.toFixed(2)}</p>
        <p><strong>Nearest Neighbor Path Length:</strong> ${data.nn_length.toFixed(2)}</p>
        ${data.exhaustive_length !== null ? `<p><strong>Exhaustive Search Path Length:</strong> ${data.exhaustive_length.toFixed(2)}</p>` : ''}
        <p><strong>Shortest Path Found By:</strong> ${data.shortest_method} (Length: ${data.shortest_length.toFixed(2)})</p>
    `;
}
