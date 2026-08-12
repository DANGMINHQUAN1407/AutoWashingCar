/**
 * Extracts and maps API errors into clean, user-friendly English messages.
 * Parses HTTP exception patterns, JSON error fields, ASP.NET validation errors, and provides clear fallbacks.
 */
export function extractErrorMessage(err: any, fallbackMessage: string = 'Operation failed.'): string {
  if (!err) return fallbackMessage

  let rawMsg = ''
  if (typeof err === 'string') {
    rawMsg = err
  } else if (err instanceof Error) {
    rawMsg = err.message
  } else if (err.message) {
    rawMsg = err.message
  } else if (err.error) {
    rawMsg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
  } else {
    try {
      rawMsg = JSON.stringify(err)
    } catch {
      rawMsg = String(err)
    }
  }

  // Check if the message contains a JSON-like string
  try {
    const jsonStart = rawMsg.indexOf('{')
    if (jsonStart !== -1) {
      const jsonStr = rawMsg.substring(jsonStart)
      const parsed = JSON.parse(jsonStr)
      
      let errorContent = parsed.error || parsed.message || parsed.Message || parsed.Error
      
      // Handle ASP.NET Core Validation Errors format
      if (!errorContent && parsed.errors) {
        const keys = Object.keys(parsed.errors)
        if (keys.length > 0) {
          const firstErr = parsed.errors[keys[0]]
          errorContent = Array.isArray(firstErr) ? firstErr[0] : String(firstErr)
        }
      }
      
      // Fallback to title (e.g., "One or more validation errors occurred.")
      if (!errorContent && parsed.title) {
        errorContent = parsed.title
      }

      if (errorContent) {
        // Translate common validation message terms
        let translated = String(errorContent)
        if (translated.includes('is required')) {
          translated = 'Please fill in all required fields.'
        } else if (translated.includes('is not a valid email address')) {
          translated = 'Invalid email address.'
        }
        return translated
      }
    }
  } catch (e) {
    // Ignore JSON parsing errors
  }

  // HTTP error code checking & common mappings
  const rawMsgLower = rawMsg.toLowerCase()

  // 409 Conflict
  if (rawMsg.includes('409') || rawMsgLower.includes('conflict')) {
    if (rawMsgLower.includes('hạng') || rawMsgLower.includes('tier') || rawMsgLower.includes('thành viên') || rawMsgLower.includes('member')) {
      return 'Cannot disable this membership tier because customers currently belong to it.'
    }
    if (rawMsgLower.includes('branch') || rawMsgLower.includes('chi nhánh')) {
      return 'This branch is currently linked to other services, appointments, or staff.'
    }
    if (rawMsgLower.includes('phone') || rawMsgLower.includes('số điện thoại') || rawMsgLower.includes('sđt')) {
      return 'This phone number is already registered in the system.'
    }
    if (rawMsgLower.includes('email')) {
      return 'This email address is already registered in the system.'
    }
    return 'Data conflict or record already exists.'
  }

  // 401 Unauthorized
  if (rawMsg.includes('401') || rawMsgLower.includes('unauthorized')) {
    return 'Incorrect username or password, or your session has expired.'
  }

  // 403 Forbidden
  if (rawMsg.includes('403') || rawMsgLower.includes('forbidden')) {
    return 'You do not have permission to perform this action.'
  }

  // 404 Not Found
  if (rawMsg.includes('404') || rawMsgLower.includes('not found')) {
    return 'Requested data not found.'
  }

  // 500 Internal Server Error
  if (rawMsg.includes('500') || rawMsgLower.includes('internal server error')) {
    return 'Internal server error. Please try again later.'
  }

  // Connection errors
  if (rawMsgLower.includes('failed to fetch') || rawMsgLower.includes('network error') || rawMsgLower.includes('load failed')) {
    return 'Failed to connect to the server. Please check your network connection.'
  }

  // If there's an HTTP code but no specific mapping, clean it up by removing "HTTP 400 Bad Request " prefix
  let cleanMsg = rawMsg
  if (cleanMsg.startsWith('HTTP ')) {
    cleanMsg = cleanMsg.replace(/^HTTP \d+ [A-Za-z ]+\s*/, '')
  }

  // If it's HTML, return fallback
  if (cleanMsg.includes('<!DOCTYPE html>') || cleanMsg.trim().startsWith('<')) {
    return 'An error occurred on the system. Please try again later.'
  }

  return cleanMsg || fallbackMessage
}
