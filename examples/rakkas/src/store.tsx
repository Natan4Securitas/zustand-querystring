import { useRequestContext, useSSQ } from "rakkasjs";
import { createContext, useContext, useState } from "react";
import { create, useStore as useZustandStore } from "zustand";
import { querystring } from "zustand-querystring";
import { immer } from "zustand/middleware/immer";

export type Configuration = {
  someApiUrl: string;
  language: string;
};

interface Store {
  configuration: Configuration;
  count: number;
  incrementCount: () => void;
  decrementCount: () => void;

  ticks: number;
  incrementTicks: () => void;

  someNestedState: {
    nestedCount: number;
    incrementNestedCount: () => void;

    hello: string;
    setHello: (hello: string) => void;
  };
}

export interface CreateStoreOptions {
  defaultState: Partial<Store> & { configuration: Configuration };
  url?: string;
}

export const createStore = (options: CreateStoreOptions) =>
  create<Store>()(
    querystring(
      immer((set, get) => ({
        count: 0,
        incrementCount: () =>
          set((state) => {
            state.count += 1;
          }),
        decrementCount: () =>
          set((state) => {
            state.count -= 1;
          }),

        ticks: 0,
        incrementTicks: () =>
          set((state) => {
            state.ticks += 1;
          }),

        someNestedState: {
          nestedCount: 0,
          incrementNestedCount: () =>
            set((state) => {
              state.someNestedState.nestedCount += 1;
            }),

          hello: "Hello",
          setHello: (hello: string) =>
            set((state) => {
              state.someNestedState.hello = hello;
            }),
        },
        ...options.defaultState,
      })),
      {
        url: options.url,
        // select controls what part of the state is synced with the query string
        // pathname is the current route (e.g. /about or /)
        select(pathname) {
          return {
            count: true,
            // ticks: false, <- false by default

            someNestedState: {
              nestedCount: true,
              hello: "/about" === pathname,
            },

            // OR select the whole nested state
            // someNestedState: true
          };
        },
      },
    ),
  );

type StoreType = ReturnType<typeof createStore>;
const zustandContext = createContext<StoreType | null>(null);

export const useStore = <T = Store,>(selector?: (state: Store) => T) => {
  selector ??= (state) => state as T;
  const store = useContext(zustandContext);
  if (!store) throw new Error("Store is missing the provider");
  return useZustandStore(store, selector);
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: configuration } = useSSQ((ctx) => ({
    someApiUrl: process.env.SOME_PUBLIC_API_URL || "",
    language: "en", // or detect from ctx.request.headers
  }));

  const ctx = useRequestContext();
  const [store] = useState(
    () =>
      createStore({
        url: ctx?.request.url,
        defaultState: { configuration },
      }),
  );

  return <zustandContext.Provider value={store}>{children}</zustandContext.Provider>;
};
