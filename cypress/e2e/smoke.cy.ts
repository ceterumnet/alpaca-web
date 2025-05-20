// https://on.cypress.io/api

describe('Smoke Tests', () => {
  beforeEach(() => {
    // Visit the base URL before each test
    cy.visit('/')
  })

  it('should load the main application view (PanelLayoutView)', () => {
    // Assert that the main panel layout view container is visible
    cy.get('.panel-layout-view').should('be.visible')
  })

  it('should navigate to Settings and back to Home', () => {
    // Click on the Settings link in the navigation bar
    cy.get('a.aw-navigation-bar__link[href="/settings"]').click()

    // Assert that the URL changed to /settings
    cy.url().should('include', '/settings')

    // Assert that the settings view container is visible
    cy.get('.aw-settings-view').should('be.visible')

    // Click on the Home link in the navigation bar
    cy.get('a.aw-navigation-bar__link[href="/"]').click()

    // Assert that the URL changed back to /
    cy.url().should('match', /\/$/) // Matches the root path

    // Assert that the main panel layout view container is visible again
    cy.get('.panel-layout-view').should('be.visible')
  })
})
