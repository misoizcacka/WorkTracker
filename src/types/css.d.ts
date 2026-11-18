// Type declarations for CSS module imports
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Specific declarations for third-party CSS imports
declare module 'maplibre-gl/dist/maplibre-gl.css';
declare module 'react-datepicker/dist/react-datepicker.css';
