import { createContext, useContext, ReactNode } from 'react';

interface ExportContextType {
  isExportMode: boolean;
}

const ExportContext = createContext<ExportContextType>({ isExportMode: false });

export const useExportMode = () => useContext(ExportContext);

interface ExportProviderProps {
  children: ReactNode;
  isExportMode: boolean;
}

export const ExportProvider = ({ children, isExportMode }: ExportProviderProps) => {
  return (
    <ExportContext.Provider value={{ isExportMode }}>
      {children}
    </ExportContext.Provider>
  );
};
