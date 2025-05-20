# These are Dave's personal notes about the system

## NOTES

- I've seen some weird inconsistencies in the store implementations and how variables / states are named and accessed
- I need to run an audit to ensure the stores use a consistent polling architecture. Perhaps that can be part of the devicestate revamp
- Need to review the \*DeviceProperties vs the states of the stores

FUTURE:

- [ ] Wire up PHD2 monitor - https://github.com/OpenPHDGuiding/phd2/wiki/EventMonitoring
- [ ] add support for Alpaca supported actions

        Ok - we have the base client along with the other clients in@api- Additionally, we have @UnifiedStore.ts along with some other helpers such as @AlpacaFeatureMap.ts @alpacaPropertyAccess.ts

        There is a part of the alpaca spec that I would like to implement which is supportedactions.

        The return result is a list of values that can then be used in the "action" API endpoint with a PUT per the spec.

# TODO

## Github stuff

- [ ] Figure out better dependabot configuration
- [ ] Automate distribution builds with standalone and proxy version

## Testing

- [x] Write unit tests for clients
- [x] Write unit tests for stores:
- [ ] Write unit tests for panels
- [ ] Write e2e tests...
- [ ] Open question: I have a buggy behavior in the cover calibrator. I would like to reveal this through a test that attempts to open the cover and demonstrate that it isn't working correctly.

## Features

- [ ] Telescope Panel is missing a lot of indicators of status such as "At Home" / "Parked" / Slewing / Tracking. Some of these are combined with the inputs, but it isn't a great UX
- [ ] Wire settings up
- [ ] Create logging system for user
- [ ] Filterwheel Panel should have concept of moving while switching filters

## Bugs

- [ ] We need to add some better handling of repeated failures to alpaca. They need to get marked as not supported after 3 calls or something like that
- [ ] ClientID needs to be initialized once and reused across the project
- [ ] ClientTransactionID needs to be initialized once and then incremented globally across the project
- [ ] Discovery errors need to be fixed
- [ ] Buttons on switch panel don't have the right colors
- [ ] Dome doesn't seem to be showing the status and has no polling. Also needs love
- [ ] Cover Calibrator has some sort of sequencing issue and doesn't seem to reflect the correct statuses

## UX Issues

- [ ] Notifications are weird. The CSS styles aren't quite right they don't always honor dark mode
- [ ] Toasts should only show up for errors
- [ ] Opening notifications doesn't need to generate a notification :)

## Documentation

- [ ] Generate Audit for Simplified Panels against what is available in the stores
- [ ] Create build instruction with specific examples of how the 2 critical environment variables work: `VITE_APP_BASE_PATH=/html/ VITE_APP_DISCOVERY_MODE=direct npm run build`
- [ ] Update README.md to include a project overview with links to the different documents available

## General System

- [ ] Need to implement the devicestate notes that were made
- [ ] Do systemwide audit of logging patterns
- [ ] Based on audit result, define consistent logging methodology
