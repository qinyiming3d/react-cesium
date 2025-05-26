import React from 'react';

const Legend = ({ min, max, gradient, width = 300, height = 50 }) => {
    return (
        <div style={{ width: `${width}px`, position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999, color: '#fff' }}>
            {/* 颜色渐变条 */}
            <div
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    marginBottom: '8px',
                    backgroundImage: gradient ? `url(${gradient})` : 'none',
                    backgroundSize: '100% 100%',
                }}
            />
            {/* 最小值与最大值标签 */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <span>{min.toFixed(2)}</span>
                <span>{max.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default Legend;