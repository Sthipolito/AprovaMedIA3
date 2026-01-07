import React from 'react';

interface LineChartProps {
    title: string;
    icon: React.ElementType;
    data: { date: string; count: number }[];
}

const LineChart: React.FC<LineChartProps> = ({ title, icon: Icon, data }) => {
    const PADDING = 40;
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 200;

    const maxCount = Math.max(...data.map(d => d.count), 0);
    const yAxisMax = Math.ceil(maxCount / 10) * 10 || 10;

    const points = data.map((d, i) => {
        const x = PADDING + (i / (data.length - 1)) * (SVG_WIDTH - 2 * PADDING);
        const y = SVG_HEIGHT - PADDING - (d.count / yAxisMax) * (SVG_HEIGHT - 2 * PADDING);
        return `${x},${y}`;
    }).join(' ');
    
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {title}
            </h3>
            {data.length > 1 ? (
                <div className="relative">
                    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto">
                        {/* Y-Axis lines */}
                        {[0, 0.5, 1].map(multiple => (
                            <line
                                key={multiple}
                                x1={PADDING}
                                y1={SVG_HEIGHT - PADDING - multiple * (SVG_HEIGHT - 2 * PADDING)}
                                x2={SVG_WIDTH - PADDING}
                                y2={SVG_HEIGHT - PADDING - multiple * (SVG_HEIGHT - 2 * PADDING)}
                                stroke="#E5E7EB"
                                strokeWidth="1"
                            />
                        ))}
                         {/* Y-Axis Labels */}
                        <text x={PADDING - 8} y={PADDING} textAnchor="end" fontSize="10" fill="#6B7281">{yAxisMax}</text>
                        <text x={PADDING - 8} y={PADDING + (SVG_HEIGHT - 2 * PADDING) / 2} textAnchor="end" fontSize="10" fill="#6B7281">{yAxisMax/2}</text>
                        <text x={PADDING - 8} y={SVG_HEIGHT - PADDING} textAnchor="end" fontSize="10" fill="#6B7281">0</text>


                        {/* X-Axis Labels */}
                        {data.map((d, i) => {
                             if (i % Math.floor(data.length / 5) !== 0 && i !== data.length - 1) return null;
                            const x = PADDING + (i / (data.length - 1)) * (SVG_WIDTH - 2 * PADDING);
                             return (
                                <text key={i} x={x} y={SVG_HEIGHT - PADDING + 15} textAnchor="middle" fontSize="10" fill="#6B7281">
                                    {formatDate(d.date)}
                                </text>
                            );
                        })}

                        {/* Line */}
                        <polyline
                            fill="none"
                            stroke="#0D9488"
                            strokeWidth="2"
                            points={points}
                        />
                         {/* Points */}
                         {data.map((d, i) => {
                             const x = PADDING + (i / (data.length - 1)) * (SVG_WIDTH - 2 * PADDING);
                             const y = SVG_HEIGHT - PADDING - (d.count / yAxisMax) * (SVG_HEIGHT - 2 * PADDING);
                             return (
                                <g key={i} className="group">
                                    <circle cx={x} cy={y} r="3" fill="#0D9488" />
                                    <circle cx={x} cy={y} r="7" fill="#0D9488" fillOpacity="0" className="cursor-pointer" />
                                     <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <rect x={x - 20} y={y - 30} width="40" height="20" rx="4" fill="#111827" />
                                        <text x={x} y={y - 17} textAnchor="middle" fontSize="10" fill="#FFFFFF" fontWeight="bold">{d.count}</text>
                                    </g>
                                </g>
                             );
                         })}
                    </svg>
                </div>
            ) : (
                <p className="text-sm text-center text-gray-500 py-8">Dados insuficientes para exibir o gráfico.</p>
            )}
        </div>
    );
};

export default LineChart;