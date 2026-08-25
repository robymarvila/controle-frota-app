import { registerPlugin } from '@capacitor/core';

// Singleton registration to prevent "Capacitor plugin FleetLocation already registered" warning
const FleetLocation = registerPlugin('FleetLocation');

export default FleetLocation;
export { FleetLocation };
