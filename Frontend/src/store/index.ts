import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../models';

interface AuthState {
  token: string | null;
  user: User | null;
}

const persisted = (() => {
  try {
    const raw = localStorage.getItem('dms_auth');
    if (!raw) return null;
    return JSON.parse(raw) as { token: string; user: User };
  } catch { return null; }
})();

const initialState: AuthState = {
  token: persisted?.token || null,
  user: persisted?.user || null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state: AuthState, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('dms_auth', JSON.stringify(action.payload));
    },
    logout(state: AuthState) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('dms_auth');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
