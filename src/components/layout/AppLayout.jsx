import PropTypes from 'prop-types';
import { AppShell, ScrollArea } from '@mantine/core';
import { useState } from 'react';
import { TopBar } from './TopBar.jsx';
import { SideNav } from './SideNav.jsx';

export function AppLayout({ children }) {
  const [opened, setOpened] = useState(false);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="md"
    >
      <AppShell.Header>
        <TopBar opened={opened} onToggle={() => setOpened((prev) => !prev)} />
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <ScrollArea type="hover">
          <SideNav onNavigate={() => setOpened(false)} />
        </ScrollArea>
      </AppShell.Navbar>
      <AppShell.Main>
        <ScrollArea h="100%" type="hover">
          {children}
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node.isRequired
};
