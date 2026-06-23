import { useContext } from 'react';
import TypographyContext from '../context/TypographyContext';

export const useTypography = () => {
  const context = useContext(TypographyContext);
  if (!context) {
    throw new Error('useTypography must be used within a TypographyProvider');
  }
  return context;
};

export default useTypography;
