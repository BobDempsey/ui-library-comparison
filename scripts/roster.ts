/**
 * The eight builds from section 1 of the spec, and nothing else. Both the
 * scaffold and the scoring read this, so a build's library, framework, and kind
 * are written down once and every result file is labelled the same way.
 */
export interface RosterEntry {
  library: string;
  framework: 'react' | 'vue';
  /** shadcn/ui and Headless UI are assembly kits, per decision 4. */
  kind: 'suite' | 'assembly-kit';
}

export const ROSTER: Record<string, RosterEntry> = {
  'react-shadcn': { library: 'shadcn/ui', framework: 'react', kind: 'assembly-kit' },
  'react-mui': { library: 'Material UI', framework: 'react', kind: 'suite' },
  'react-chakra': { library: 'Chakra UI', framework: 'react', kind: 'suite' },
  'react-antd': { library: 'Ant Design', framework: 'react', kind: 'suite' },
  'react-headless': { library: 'Headless UI', framework: 'react', kind: 'assembly-kit' },
  'vue-vuetify': { library: 'Vuetify', framework: 'vue', kind: 'suite' },
  'vue-primevue': { library: 'PrimeVue', framework: 'vue', kind: 'suite' },
  'vue-quasar': { library: 'Quasar', framework: 'vue', kind: 'suite' },
};
