// declarations.d.ts
declare module 'sockjs-client';
declare module 'text-encoding';
declare module 'react-native-orientation-locker' {
  const Orientation: {
    lockToLandscape:  () => void;
    lockToPortrait:   () => void;
    lockToLandscapeLeft: () => void;
    lockToLandscapeRight: () => void;
    unlockAllOrientations: () => void;
    getOrientation: (cb: (orientation: string) => void) => void;
  };
  export default Orientation;
}