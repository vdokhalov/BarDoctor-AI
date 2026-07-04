import React, {
  createContext, useContext, useState, useCallback,
  useRef, useEffect, ReactNode,
} from 'react';
import {
  RestaurantEvent,
  loadEvents, saveEvents, sortByEventDate,
} from '@/store/events';

interface EventsContextValue {
  events: RestaurantEvent[];
  /** Returns false if localStorage quota was exceeded (event still lives in session state). */
  addEvent:    (event: RestaurantEvent) => boolean;
  updateEvent: (id: string, patch: Partial<RestaurantEvent>) => void;
  deleteEvent: (id: string) => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<RestaurantEvent[]>(() =>
    sortByEventDate(loadEvents()),
  );
  // Always-current ref so callbacks don't need events in their dep arrays
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const addEvent = useCallback((event: RestaurantEvent): boolean => {
    const next = sortByEventDate([event, ...eventsRef.current]);
    const ok   = saveEvents(next);
    setEvents(next);
    return ok;
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<RestaurantEvent>) => {
    const next = sortByEventDate(
      eventsRef.current.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
      ),
    );
    saveEvents(next);
    setEvents(next);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    const next = eventsRef.current.filter((e) => e.id !== id);
    saveEvents(next);
    setEvents(next);
  }, []);

  return (
    <EventsContext.Provider value={{ events, addEvent, updateEvent, deleteEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used inside EventsProvider');
  return ctx;
}
