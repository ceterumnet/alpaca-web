# Adapter Testing Guide

This guide explains how to run the tests for verifying the adapter implementation that bridges between the legacy device store and the new unified astronomy device store.

## Test Files

- `unit/StoreAdapter.test.ts` - Tests for adapter functionality
- `unit/ComponentRendering.test.ts` - Tests for component compatibility
- `unit/TestHelpers.ts` - Utility functions for testing

## Running Tests

### Prerequisites

Make sure you have Node.js installed (v16 or higher recommended).

### Steps to Run Tests

1. In your terminal, navigate to the project directory
2. Run the test script:

```bash
# Run all tests
npm run test:unit

# Run specific test
npx vitest run src/tests/unit/StoreAdapter.test.ts
```

Alternatively, you can use the provided test runner:

```bash
# From project root
./src/tests/run-tests.sh
```

## Test Coverage

The tests verify the following flows:

1. **Store Initialization** - Verifies both stores initialize correctly
2. **Device Discovery Flow** - Tests if devices added to the legacy store appear in the new store
3. **Device Connection Flow** - Tests if connection states propagate between stores
4. **Device Management Flow** - Tests if property updates propagate between stores
5. **Device Disconnection Flow** - Tests if disconnection states propagate correctly
6. **Device Removal Flow** - Tests if device removal propagates correctly
7. **Bidirectional Flow** - Tests if changes in the new store propagate to the legacy store
8. **Component Compatibility** - Tests if Vue components work with the adapter approach

## Understanding Test Output

The test output uses color coding:

- ✓ **Green** - Passed tests
- ✗ **Red** - Failed tests
- ℹ **Blue** - Informational messages
- ► **Yellow** - Test section headers

## Extending Tests

To add new tests:

1. Add helper functions to `TestHelpers.ts` if needed
2. Add new test cases to the test files
3. Follow the existing pattern of:
   - Setting up test conditions
   - Performing actions
   - Verifying expected outcomes

## Debugging Failed Tests

If tests fail:

1. Check the error messages for clues about what went wrong
2. Verify store implementations match the expected API contract
3. Check for timing issues (you may need to adjust delay times)
4. Verify the adapter correctly transforms data between the two store formats

## Integration with TypeScript

The tests have been converted to TypeScript to ensure:

1. Type safety throughout the testing process
2. Better IDE integration and autocompletion
3. Consistency with the rest of the TypeScript codebase
4. Proper handling of interfaces and types used in the application
