package expo.modules.lockscreen

import android.app.Activity
import android.app.ActivityManager
import android.app.Application
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import java.lang.ref.WeakReference
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

class LockscreenPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context): List<ReactActivityLifecycleListener> =
    listOf(LockscreenActivityListener())
}

/**
 * Lets MainActivity appear over the keyguard only right after the service's SCREEN_ON
 * (one-shot ticket in LockscreenPrefs). Normal launches never show over the lock, and the
 * flag is cleared as soon as the activity stops being visible.
 */
class LockscreenActivityListener : ReactActivityLifecycleListener {
  override fun onCreate(activity: Activity?, savedInstanceState: Bundle?) {
    activity?.let {
      current = WeakReference(it)
      // Until the card reports it is on screen, no other route may be reused as the
      // snapshot Android shows first on SCREEN_ON.
      if (LockscreenPrefs.isEnabled(it)) setCardOnScreen(it, false)
      if (LockscreenModule.supported) it.registerActivityLifecycleCallbacks(StopWatcher)
      // The system draws the task-snapshot transition on SCREEN_ON over the task's
      // background color, which defaults to white with a light system theme.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        it.setTaskDescription(ActivityManager.TaskDescription.Builder().setBackgroundColor(COVER_COLOR).build())
      }
      allowIfTicket(it)
    }
  }

  override fun onResume(activity: Activity) {
    current = WeakReference(activity)
    resumed = true
    allowIfTicket(activity)
    activity.getSystemService(NotificationManager::class.java)?.cancel(LockscreenService.ID_CARD)
    // The cover only exists for the trip over the keyguard. A normal return (phone
    // unlocked) shows whatever route is there, at once.
    val locked = activity.getSystemService(KeyguardManager::class.java)?.isKeyguardLocked ?: false
    if (!locked) removeCover(activity)
    // Fallback: if the card never reports back (JS error), never leave the app covered.
    else handler.postDelayed({ removeCover(activity) }, COVER_FALLBACK_MS)
  }

  override fun onPause(activity: Activity) {
    resumed = false
    // Not clear() here: while the screen turns on, Android may pause the activity with
    // reason "sleep" before it releases the sleep token, then resume it again. Clearing
    // the flag on that pause un-occludes the keyguard and the card vanishes after
    // ~0.5 s. The flag is cleared once the activity is really gone (StopWatcher).
    // Pressing power turns the display off at once: no frame is drawn after this, so the
    // JS push to /lockscreen only reaches the screen after SCREEN_ON, and the first frame
    // would be the route the user left (the list). A native view change is applied
    // synchronously, so cover the content now; the card removes the cover once drawn.
    if (LockscreenModule.supported && LockscreenPrefs.isEnabled(activity) && !cardOnScreen) addCover(activity)
  }

  override fun onDestroy(activity: Activity) {
    if (current?.get() === activity) current = null
  }

  override fun onNewIntent(intent: Intent?): Boolean {
    current?.get()?.let { allowIfTicket(it, intent) }
    return false
  }

  private fun allowIfTicket(activity: Activity, intent: Intent? = activity.intent) {
    if (!LockscreenModule.supported) return
    if (LockscreenPrefs.isEnabled(activity) && LockscreenPrefs.consumePendingShow(intent)) allow(activity)
  }

  /** Clears the show-when-locked flag once the activity is no longer visible. */
  private object StopWatcher : Application.ActivityLifecycleCallbacks {
    override fun onActivityStopped(activity: Activity) = clear(activity)
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
    override fun onActivityStarted(activity: Activity) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
    override fun onActivityDestroyed(activity: Activity) = Unit
  }

  companion object {
    /**
     * The live MainActivity, if any. An activity that already exists behind the keyguard is
     * not resumed until unlock, so the service must set the flag on it *before* bringing it
     * to the front (otherwise the card only appears after unlocking).
     */
    @Volatile
    private var current: WeakReference<Activity>? = null

    @Volatile
    private var resumed = false
    private val handler = Handler(Looper.getMainLooper())

    /**
     * Called by the service on SCREEN_ON (main thread), before startActivity.
     * Fail-closed: if the card has not come to the foreground within the TTL
     * (launch blocked, user ignored it), the flag is revoked again.
     */
    fun allowCurrent(ctx: Context) {
      if (!LockscreenModule.supported || !LockscreenPrefs.isEnabled(ctx)) return
      val activity = current?.get() ?: return
      allow(activity)
      handler.postDelayed({ if (!resumed) clear(activity) }, REVOKE_AFTER_MS)
    }

    /** Called by the service when the launch failed. */
    fun clearCurrent() {
      current?.get()?.let { clear(it) }
    }

    private const val REVOKE_AFTER_MS = 5_000L

    private fun allow(activity: Activity) {
      activity.setShowWhenLocked(true)
      activity.setTurnScreenOn(true)
    }

    private const val COVER_FALLBACK_MS = 1_500L
    private const val COVER_TAG = "expo.modules.lockscreen.COVER"
    /** Same as `colors.bg` in src/theme.ts and the splash background. */
    internal val COVER_COLOR = Color.parseColor("#0B0F1A")

    /** True while the card route is focused and drawn (reported by JS). */
    @Volatile
    private var cardOnScreen = false

    /**
     * Called by the card when it is drawn (true) and when it leaves the screen (false).
     * - Android 13+: the task snapshot (first frame shown when the task comes back) may only
     *   be the card; otherwise Android uses a plain window-background frame.
     * - Removes the cover added in onPause once the card is what the screen shows.
     */
    fun setCardOnScreen(activity: Activity, onScreen: Boolean) {
      cardOnScreen = onScreen
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        activity.setRecentsScreenshotEnabled(onScreen)
      }
      if (onScreen) removeCover(activity)
    }

    private fun content(activity: Activity): ViewGroup? = activity.findViewById(android.R.id.content)

    private fun addCover(activity: Activity) {
      val root = content(activity) ?: return
      if (root.findViewWithTag<View>(COVER_TAG) != null) return
      val cover = View(activity).apply {
        tag = COVER_TAG
        setBackgroundColor(COVER_COLOR)
        isClickable = true // swallow touches until the card is there
      }
      root.addView(cover, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    }

    fun removeCover(activity: Activity) {
      val root = content(activity) ?: return
      root.findViewWithTag<View>(COVER_TAG)?.let { root.removeView(it) }
    }

    fun clear(activity: Activity) {
      if (!LockscreenModule.supported) return
      activity.setShowWhenLocked(false)
      activity.setTurnScreenOn(false)
    }
  }
}
