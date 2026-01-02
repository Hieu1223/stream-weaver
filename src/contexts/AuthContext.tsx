import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Channel } from '@/lib/models';
import * as api from '@/lib/api';

interface AuthContextType {
  channel: Channel | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (displayName: string, username: string, password: string, description?: string) => Promise<void>;
  logout: () => void;
  refreshChannel: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedChannelId = localStorage.getItem('channel_id');
    if (savedToken && savedChannelId) {
      setToken(savedToken);
      api.getChannelDetail(savedChannelId).then(setChannel).catch(() => logout());
    }
  }, []);

  const login = async (username: string, password: string) => {
    const authResponse = await api.getToken(username, password);
    const idResponse = await api.getIdFromToken(authResponse.auth_token);
    const channelData = await api.getChannelDetail(idResponse.channel_id);
    
    setToken(authResponse.auth_token);
    setChannel(channelData);
    localStorage.setItem('auth_token', authResponse.auth_token);
    localStorage.setItem('channel_id', idResponse.channel_id);
  };

  const register = async (displayName: string, username: string, password: string, description?: string) => {
    const response = await api.createChannel({ 
      display_name: displayName, 
      username, 
      password, 
      description: description || '' 
    });
    
    if (response.auth_token && response.channel_id) {
      setToken(response.auth_token);
      const channelData = await api.getChannelDetail(response.channel_id);
      setChannel(channelData);
      localStorage.setItem('auth_token', response.auth_token);
      localStorage.setItem('channel_id', response.channel_id);
    }
  };

  const logout = () => {
    setChannel(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('channel_id');
  };

  const refreshChannel = async () => {
    if (channel?.channel_id) {
      const updated = await api.getChannelDetail(channel.channel_id);
      setChannel(updated);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      channel, 
      token, 
      isAuthenticated: !!token, 
      login, 
      register, 
      logout,
      refreshChannel 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
