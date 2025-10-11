import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

export function renderWithProviders(ui, options = {}) {
  const { route = '/', initialEntries, queryClient } = options;
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

  return {
    ...render(
      <MemoryRouter initialEntries={initialEntries || [route]}>
        <QueryClientProvider client={client}>
          <MantineProvider>{ui}</MantineProvider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
    queryClient: client
  };
}
