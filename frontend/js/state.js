// Global Reactive Application State

class StateManager {
  constructor() {
    this.state = {
      currentUser: null,
      activeRole: 'SUPER_ADMIN',
      activeVentureId: 'ven-dharshini-a',
      ventures: [],
      currentTab: 'dashboard',
      isLoading: false
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    }
  }
}

export const state = new StateManager();
