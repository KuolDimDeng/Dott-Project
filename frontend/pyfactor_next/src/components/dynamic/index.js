/**
 * Dynamic Import Wrappers
 * Industry-standard approach to reduce initial bundle size
 */

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/Spinner';

// Loading component
const LoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <Spinner size="lg" />
  </div>
);

// Chart Components (Heavy: ~200KB each)
export const DynamicRecharts = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

export const DynamicChartJS = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// Calendar Components (Heavy: ~300KB)
export const DynamicFullCalendar = dynamic(
  () => import('@fullcalendar/react').then(mod => mod.default),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// Data Export Components (Heavy: ~150KB each)
export const DynamicExcelExport = dynamic(
  () => import('@/components/export/ExcelExport'),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

export const DynamicPDFExport = dynamic(
  () => import('@/components/export/PDFExport'),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// Map Components (Heavy: ~250KB)
export const DynamicLeafletMap = dynamic(
  () => import('@/components/maps/LeafletMap'),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// Date Picker (Medium: ~80KB)
export const DynamicDatePicker = dynamic(
  () => import('react-datepicker'),
  { 
    loading: () => <input type="date" className="form-input" />,
    ssr: false 
  }
);

// Color Picker (Medium: ~60KB)
export const DynamicColorPicker = dynamic(
  () => import('react-color').then(mod => mod.SketchPicker),
  { 
    loading: () => <input type="color" className="form-input" />,
    ssr: false 
  }
);

// Rich Text Editor (Heavy: ~400KB)
export const DynamicRichTextEditor = dynamic(
  () => import('@/components/editor/RichTextEditor'),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// QR Code Components (Medium: ~50KB)
export const DynamicQRCode = dynamic(
  () => import('qrcode.react').then(mod => mod.QRCodeSVG),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// Table Components (Heavy: ~120KB)
export const DynamicDataTable = dynamic(
  () => import('@/components/tables/DataTable'),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// Form Libraries (Medium: ~100KB)
export const DynamicFormik = dynamic(
  () => import('@/components/forms/FormikWrapper'),
  { 
    loading: LoadingComponent,
    ssr: false 
  }
);

// Helper to preload components
export const preloadComponent = (componentName) => {
  switch(componentName) {
    case 'charts':
      DynamicRecharts.preload();
      DynamicChartJS.preload();
      break;
    case 'calendar':
      DynamicFullCalendar.preload();
      break;
    case 'export':
      DynamicExcelExport.preload();
      DynamicPDFExport.preload();
      break;
    case 'maps':
      DynamicLeafletMap.preload();
      break;
    default:
      break;
  }
};