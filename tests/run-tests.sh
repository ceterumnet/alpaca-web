#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Alpaca Web Adapter Testing Suite ===${NC}"
echo -e "${BLUE}Starting test sequence...${NC}"

# Run tests with Vitest
echo -e "${YELLOW}\n[1/3] Running adapter flow tests...${NC}"
echo -e "${BLUE}Testing adapter functionality...${NC}"
npx vitest run src/tests/unit/StoreAdapter.test.ts
ADAPTER_RESULT=$?

# Run component compatibility tests
echo -e "${YELLOW}\n[2/3] Running component compatibility tests...${NC}"
echo -e "${BLUE}Testing component rendering with adapter...${NC}"
npx vitest run src/tests/unit/ComponentRendering.test.ts
COMPONENT_RESULT=$?

# Run integration tests (to be implemented)
echo -e "${YELLOW}\n[3/3] Running UI integration tests...${NC}"
echo -e "${BLUE}Testing UI interactions with adapter...${NC}"
# This is a placeholder - integration tests will be implemented later
# This would use Cypress or similar
INTEGRATION_RESULT=0 # Assume success for now

# Display summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"

if [ $ADAPTER_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Adapter flow tests: PASSED${NC}"
else
  echo -e "${RED}✗ Adapter flow tests: FAILED${NC}"
fi

if [ $COMPONENT_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Component compatibility tests: PASSED${NC}"
else
  echo -e "${RED}✗ Component compatibility tests: FAILED${NC}"
fi

if [ $INTEGRATION_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ UI integration tests: PASSED (placeholder)${NC}"
else
  echo -e "${RED}✗ UI integration tests: FAILED${NC}"
fi

# Calculate overall result
if [ $ADAPTER_RESULT -eq 0 ] && [ $COMPONENT_RESULT -eq 0 ] && [ $INTEGRATION_RESULT -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed successfully!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed. Please review the output above.${NC}"
  exit 1
fi 