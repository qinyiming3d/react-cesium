import React, { useEffect, useState, useRef } from 'react';

const withPerformanceMonitor = (WrappedComponent) => {
  return function WithPerformanceMonitor(props) {
    const [performanceData, setPerformanceData] = useState({
      lastRenderTime: 0,
      isStuttering: false,
      lastStutterDuration: 0,
      stages: {
        upload: 0, // 上传耗时
        dataFetch: 0, // 获取数据耗时
        renderPrepare: 0,  // 清除画布元素耗时
        actualRender: 0 // 渲染耗时
      },
      stutterCount: 0, // 卡顿次数
    });

    const lastFrameTimeRef = useRef(performance.now());

    useEffect(() => {
      let observer;
      let animationFrameId;

      if (typeof window !== 'undefined' && window.PerformanceObserver) {
        // 监控长任务
        observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // 超过50ms视为长任务
              setPerformanceData(prev => ({
                ...prev,
                isStuttering: true,
                lastStutterDuration: entry.duration,
                stutterCount: prev.stutterCount + 1,
              }));
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      }

      return () => {
        if (observer) {
          observer.disconnect();
        }
      };
    }, []);

    const measureUpload = async (uploadCallback) => {
      const startTime = performance.now();
      const result = await uploadCallback();
      const duration = performance.now() - startTime;

      setPerformanceData(prev => ({
        ...prev,
        stages: {
          ...prev.stages,
          upload: duration
        }
      }));

      return result;
    };

    const measureRender = async (stages) => {
      const timings = {};
      const startTime = performance.now();

      if (stages.dataFetch) {
        const dataFetchStart = performance.now();
        await stages.dataFetch();
        timings.dataFetch = performance.now() - dataFetchStart;
      }

      if (stages.renderPrepare) {
        const renderPrepareStart = performance.now();
        await stages.renderPrepare();
        timings.renderPrepare = performance.now() - renderPrepareStart;
      }

      const renderStart = performance.now();
      const result = await stages.actualRender();
      timings.actualRender = performance.now() - renderStart;

      const totalTime = performance.now() - startTime;

      setPerformanceData(prev => ({
        lastRenderTime: totalTime,
        ...prev,
        stages: {
          ...prev.stages,
          dataFetch: timings.dataFetch || 0,
          renderPrepare: timings.renderPrepare || 0,
          actualRender: timings.actualRender
        }
      }));

      return result;
    };

    return (
        <WrappedComponent
            {...props}
            performanceData={performanceData}
            measureRender={measureRender}
            measureUpload={measureUpload}
        />
    );
  };
};

export default withPerformanceMonitor;