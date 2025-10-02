import React from 'react';

interface LoadingSpinnerProps {
    message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-black/40 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
      <p className="mt-4 text-lg text-gray-300 font-orbitron text-center">{message}</p>
    </div>
  );
};

export default LoadingSpinner;