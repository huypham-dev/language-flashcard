package expo.modules.lockscreen

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Restarts the lock-screen service after a reboot (#17) or an app update (installing a new
 * version kills the running service) if the user had it switched on.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action !in ACTIONS) return
    if (!LockscreenModule.supported || !LockscreenPrefs.isEnabled(context)) return
    try {
      context.startForegroundService(Intent(context, LockscreenService::class.java))
    } catch (e: Exception) {
      Log.e(LockscreenService.TAG, "could not restart service on ${intent.action}", e)
      LockscreenPrefs.setLastError(context, "restart: ${e.javaClass.simpleName}: ${e.message}")
    }
  }

  private companion object {
    // Some Xiaomi builds send this instead of / in addition to BOOT_COMPLETED.
    const val ACTION_QUICKBOOT = "android.intent.action.QUICKBOOT_POWERON"
    val ACTIONS = setOf(Intent.ACTION_BOOT_COMPLETED, ACTION_QUICKBOOT, Intent.ACTION_MY_PACKAGE_REPLACED)
  }
}
