declare module 'react-medium-image-zoom' {
  import * as React from 'react';

  export interface ZoomProps {
    children: React.ReactNode;
    zoomMargin?: number;
    overlayBgColorStart?: string;
    overlayBgColorEnd?: string;
  }

  const Zoom: React.FC<ZoomProps>;

  export default Zoom;
}
