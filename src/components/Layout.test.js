/**
 * Layout — Tools disclosure navigation (audit N1) + dynamic footer year (S7).
 *
 * Before this, the top nav linked only /market-overview, /stock-overview and
 * /system-manager; /technical-manager, /auto-update-monitor and /settings were
 * registered routes with no in-app link (reachable only by typing a URL). The
 * Tools disclosure surfaces all operational + config pages. These tests lock:
 * every previously-orphaned route is now linked, the disclosure is accessible
 * (aria-expanded/haspopup/controls, Escape to close), and the footer year is
 * computed, not hardcoded to 2025.
 *
 * RouterLink is stubbed to a plain <a> that echoes its `to` as data-to, so we
 * can assert targets without a real router. $route is mocked per the
 * StockOverview.test.js convention.
 */
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Layout from './Layout.vue'

const RouterLinkStub = {
  props: ['to'],
  template: '<a class="router-link-active" :data-to="to"><slot /></a>'
}

function makeMountOpts (routePath = '/market-overview') {
  return {
    global: {
      stubs: { RouterLink: RouterLinkStub, 'router-link': RouterLinkStub },
      mocks: { $route: { path: routePath } }
    }
  }
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('Layout — Tools disclosure (N1)', () => {
  const TOOLS = ['/system-manager', '/technical-manager', '/auto-update-monitor', '/settings']

  it('links every previously-orphaned route from the Tools menu', () => {
    const wrapper = mount(Layout, makeMountOpts())
    const targets = wrapper.findAll('.nav-tools-item').map(a => a.attributes('data-to'))
    for (const route of TOOLS) {
      expect(targets).toContain(route)
    }
    // The three that used to be URL-only are the point of the fix.
    expect(targets).toEqual(expect.arrayContaining(['/technical-manager', '/auto-update-monitor', '/settings']))
  })

  it('exposes an accessible disclosure toggle', () => {
    const wrapper = mount(Layout, makeMountOpts())
    const btn = wrapper.find('.nav-tools-toggle')
    expect(btn.attributes('aria-haspopup')).toBe('true')
    expect(btn.attributes('aria-controls')).toBe('nav-tools-menu')
    expect(btn.attributes('aria-expanded')).toBe('false')
  })

  it('toggles open on click and reflects it in aria-expanded', async () => {
    const wrapper = mount(Layout, makeMountOpts())
    const btn = wrapper.find('.nav-tools-toggle')

    await btn.trigger('click')
    expect(wrapper.vm.toolsOpen).toBe(true)
    expect(btn.attributes('aria-expanded')).toBe('true')

    await btn.trigger('click')
    expect(wrapper.vm.toolsOpen).toBe(false)
    expect(btn.attributes('aria-expanded')).toBe('false')
  })

  it('closes on Escape when open', async () => {
    const wrapper = mount(Layout, makeMountOpts())
    wrapper.vm.toolsOpen = true
    await wrapper.vm.$nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.toolsOpen).toBe(false)
    wrapper.unmount()
  })

  it('closes on any route change', async () => {
    const wrapper = mount(Layout, makeMountOpts())
    wrapper.vm.toolsOpen = true
    await wrapper.vm.$nextTick()

    // Simulate navigation by mutating the watched $route.
    wrapper.vm.$options.watch.$route.call(wrapper.vm)
    expect(wrapper.vm.toolsOpen).toBe(false)
  })

  it('marks the toggle active only when the current route is a Tools route', () => {
    expect(mount(Layout, makeMountOpts('/settings')).vm.isToolsRouteActive).toBe(true)
    expect(mount(Layout, makeMountOpts('/auto-update-monitor')).vm.isToolsRouteActive).toBe(true)
    expect(mount(Layout, makeMountOpts('/market-overview')).vm.isToolsRouteActive).toBe(false)
  })
})

describe('Layout — footer year (S7)', () => {
  it('renders the current year, not a hardcoded 2025', () => {
    const wrapper = mount(Layout, makeMountOpts())
    const currentYear = String(new Date().getFullYear())
    expect(wrapper.find('.copyright').text()).toContain(currentYear)
    expect(wrapper.vm.year).toBe(new Date().getFullYear())
  })
})
