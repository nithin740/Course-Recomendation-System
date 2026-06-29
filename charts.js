/**
 * Charts Module — Chart.js visualizations for the Analytics dashboard
 */

const ChartColors = {
    blue:   'rgba(79, 140, 255, 0.8)',
    purple: 'rgba(168, 85, 247, 0.8)',
    teal:   'rgba(20, 184, 166, 0.8)',
    amber:  'rgba(245, 158, 11, 0.8)',
    rose:   'rgba(244, 63, 94, 0.8)',
    sky:    'rgba(56, 189, 248, 0.8)',
    green:  'rgba(34, 197, 94, 0.8)',
    indigo: 'rgba(99, 102, 241, 0.8)',
    orange: 'rgba(251, 146, 60, 0.8)',
    pink:   'rgba(236, 72, 153, 0.8)',
};

const ChartColorsBg = {
    blue:   'rgba(79, 140, 255, 0.15)',
    purple: 'rgba(168, 85, 247, 0.15)',
    teal:   'rgba(20, 184, 166, 0.15)',
    amber:  'rgba(245, 158, 11, 0.15)',
    rose:   'rgba(244, 63, 94, 0.15)',
    sky:    'rgba(56, 189, 248, 0.15)',
    green:  'rgba(34, 197, 94, 0.15)',
    indigo: 'rgba(99, 102, 241, 0.15)',
    orange: 'rgba(251, 146, 60, 0.15)',
    pink:   'rgba(236, 72, 153, 0.15)',
};

const paletteList = Object.values(ChartColors);
const paletteBgList = Object.values(ChartColorsBg);

// Default Chart.js styling for dark theme
Chart.defaults.color = '#a0a0c0';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";

const chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

const Charts = {
    /**
     * Render category distribution bar chart
     */
    renderCategoryChart(canvasId, data) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = Object.keys(data);
        const values = Object.values(data);

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Number of Courses',
                    data: values,
                    backgroundColor: labels.map((_, i) => paletteList[i % paletteList.length]),
                    borderColor: labels.map((_, i) => paletteList[i % paletteList.length]),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 42, 0.9)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        titleFont: { weight: '600' },
                        padding: 12,
                        cornerRadius: 8,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { precision: 0 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 } }
                    }
                }
            }
        });
    },

    /**
     * Render difficulty distribution doughnut
     */
    renderDifficultyChart(canvasId, data) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = Object.keys(data);
        const values = Object.values(data);
        const colors = [ChartColors.green, ChartColors.amber, ChartColors.rose];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: 'rgba(10,10,26,0.8)',
                    borderWidth: 3,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyleWidth: 12,
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 42, 0.9)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                    }
                }
            }
        });
    },

    /**
     * Render rating distribution bar chart
     */
    renderRatingChart(canvasId, data) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Ensure all rating keys 1-5 exist
        const labels = ['1', '2', '3', '4', '5'];
        const values = labels.map(l => data[l] || data[parseInt(l)] || 0);
        const colors = [ChartColors.rose, ChartColors.orange, ChartColors.amber, ChartColors.sky, ChartColors.green];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(l => `${l} ★`),
                datasets: [{
                    label: 'Number of Ratings',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 42, 0.9)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { precision: 0 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    /**
     * Render top instructors horizontal bar
     */
    renderInstructorsChart(canvasId, data) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = Object.keys(data);
        const values = Object.values(data);

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Total Subscribers',
                    data: values,
                    backgroundColor: labels.map((_, i) => paletteList[i % paletteList.length]),
                    borderColor: labels.map((_, i) => paletteList[i % paletteList.length]),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 42, 0.9)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => `${ctx.parsed.x.toLocaleString()} subscribers`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: {
                            callback: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }
};
