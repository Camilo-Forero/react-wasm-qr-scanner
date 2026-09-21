# react-wasm-qr-scanner

A lightweight, high-performance React QR code scanner library powered by [`zxing-wasm`](https://github.com/zxing-js/zxing-wasm). 

Offers full UI flexibility by decoupling camera selection, enabling custom element styling, and providing both single-shot and continuous scanning modes.

---

## Features

- **WASM-Powered**: Extremely fast and accurate QR decoding via WebAssembly.
- **Decoupled Camera Logic**: Exported `getCameras()` utility so you can build your own camera selector.
- **Flexible Camera Selection**: Target cameras via explicit `deviceId` or simply force `"back"` / `"front"` cameras.
- **Scan Modes**: Support for single detection (`"once"`) or continuous streaming (`"flow"`).
- **Fully Customizable Styling**: Fine-grained `className` and `style` props for the container, video feed, and shutter overlay.
- **TypeScript First**: Full type definitions included.

---

## Installation

```bash
npm install react-wasm-qr-scanner
```

---

## Quick Start

### 1. Basic Scanner (Default Back Camera)

```tsx
import { WasmQrScanner } from "react-wasm-qr-scanner";

export default function App() {
  const handleScan = (qrValue: string) => {
    console.log("Decoded QR Code:", qrValue);
  };

  return (
    <WasmQrScanner onDataRead={handleScan} scan="once" />
  );
}
```

### 2. Basic Scanner (Select Default Camera)

```tsx
import { WasmQrScanner } from "react-wasm-qr-scanner";

export function App() {
  return (
    <WasmQrScanner
      selectCam="back" // or "front"
      onDataRead={(data) => console.log("QR Code:", data)}
    />
  );
}
```

### 3. Custom Camera Selector

You can retrieve available camera devices using `getCameras()` and feed the selected `deviceId` directly into the component:

```tsx
import { useEffect, useState } from "react";
import { WasmQrScanner, getCameras, CameraDevice } from "react-wasm-qr-scanner";

export default function App() {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  useEffect(() => {
    getCameras().then((devices) => {
      setCameras(devices);
      if (devices.length > 0) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    });
  }, []);

  return (
    <div>
      <select 
        value={selectedDeviceId} 
        onChange={(e) => setSelectedDeviceId(e.target.value)}
      >
        {cameras.map((cam) => (
          <option key={cam.deviceId} value={cam.deviceId}>
            {cam.label}
          </option>
        ))}
      </select>

      <WasmQrScanner 
        selectedDeviceId={selectedDeviceId}
        scan="flow" 
        scanIntervalMs={150} 
        onDataRead={(data) => console.log("Scanned QR:", data)}
      />
    </div>
  );
}
```

### 4. Custom CSS and Classes

The library got 3 parts that you can style to your needs, the parts are: `container`, `video` and `shutter`.

To style each part you can use the props to pass your classes or pure CSS, the props are: `containerClassName`, `containerCssStyle`, `videoClassName`, `videoCssStyle`, `shutterClassName`, `shutterCssStyle`, by default the library got some styles but you can overwrite it.

```tsx
<WasmQrScanner
  onDataRead={(data) => console.log(data)}
  
  // Custom Tailwind / CSS classes
  containerClassName="rounded-xl shadow-2xl"
  shutterClassName="animate-pulse"
  
  // Directly overriding inline CSS styles
  containerCssStyle={{ height: "450px" }}
  shutterCssStyle={{ border: "3px solid #00E5FF", borderRadius: "24px" }}
/>
```

### 5. Choose Scan Working Flow

The scanner can work in two ways, whe you use the prop `scan` you can choose between `once` or `flow`. By defualt is `once`

When you choose `once` the scanner is going to scan the first QR it found and if is a valid QR is going to stop.

When you choose `flow` the scanner is going to continiously scan valid QRs without stoping, so you need to use the prop `scanIntervalMs` to set in miliseconds to set the cycles of reading. (ex: 300 would scan in intervals of 300 miliseconds). By default is set to 100.

```tsx
// Single scan (stops after first read)
<WasmQrScanner
  scan="once"
  onDataRead={(qrCode) => console.log("Single QR Read:", qrCode)}
/>

// Continuous scanning (keeps scanning indefinitely)
<WasmQrScanner
  scan="flow"
  scanIntervalMs={150}
  onDataRead={(qrCode) => console.log("Streamed QR Read:", qrCode)}
/>
```

---

## API Reference

### `WasmQrScanner` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onDataRead` | `(qrValue: string) => void` | **Required** | Callback function executed when a valid QR code is decoded. |
| `selectedDeviceId` | `string` | `undefined` | Specific camera `deviceId` to stream from (overrides `selectCam`). |
| `selectCam` | `"back" \| "front"` | `"back"` | Quickly force user-facing or environment camera without manual enumeration. |
| `scan` | `"once" \| "flow"` | `"once"` | `"once"` stops after first scan; `"flow"` scans continuously. |
| `scanIntervalMs` | `number` | `100` | Delay in milliseconds between WASM frame decoding cycles. |
| `containerClassName` | `string` | `undefined` | CSS class name for the outer wrapper `<div>`. |
| `containerCssStyle` | `CSSProperties` | `{}` | Inline styles for the outer wrapper `<div>`. |
| `videoClassName` | `string` | `undefined` | CSS class name for the `<video>` element. |
| `videoCssStyle` | `CSSProperties` | `{}` | Inline styles for the `<video>` element. |
| `shutterClassName` | `string` | `undefined` | CSS class name for the target shutter box overlay. |
| `shutterCssStyle` | `CSSProperties` | `{}` | Inline styles for the target shutter box overlay. |

---

## Utilities

### `getCameras(): Promise<CameraDevice[]>`

Enumerates available video input devices and returns an array of camera objects:

```ts
interface CameraDevice {
  deviceId: string;
  label: string;
}
```

---

## License

MIT
