import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils.jsx';
import LoginPage from '../src/pages/LoginPage.jsx';

const loginMock = vi.fn();

vi.mock('../src/features/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({
    login: loginMock,
    isAuthenticated: false,
    role: null
  })
}));

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('prevents submit when fields are empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits login data', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce({ role: 'author' });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/密码/), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(loginMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      role: 'author'
    });
  });
});
