module.exports = {
  rules: {
    'custom/require-status-comment': [
      'error',
      {
        message: 'Files must include a status comment in the format: // Status: [Status] - [Type]',
        pattern:
          /^\/\/ Status: (Good|Legacy|Transitional|Partial Implementation|To Be Refactored) - (Core Component|Core Service|Core Store|Core Type Definition|Core View|Core Module|Core UI Component|Prototype|Demo)/
      }
    ]
  }
}
