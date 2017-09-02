/**
 * xGesture.js
 * https://github.com/kiinlam/xGesture
 */

; (function (window, $) {
    var isSupportTouch = 'ontouchend' in document ? true : false,
        _touchstart = isSupportTouch ? 'touchstart' : 'mousedown',
        _touchmove = isSupportTouch ? 'touchmove' : 'mousemove',
        _touchend = isSupportTouch ? 'touchend' : 'mouseup',
        touch = {},
        touchTimeout, tapTimeout, swipeTimeout, longTapTimeout,
        longTapDelay = 750,
        gesture;

    function direction(x1, x2, y1, y2) {
        return Math.abs(x1 - x2) >=
            Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down');
    }

    function longTap() {
        longTapTimeout = null;
        if (touch.last) {
            touch.el.trigger('longTap');
            touch = {};
        }
    }

    function cancelLongTap() {
        if (longTapTimeout) clearTimeout(longTapTimeout);
        longTapTimeout = null;
    }

    function cancelAll() {
        if (touchTimeout) clearTimeout(touchTimeout);
        if (tapTimeout) clearTimeout(tapTimeout);
        if (swipeTimeout) clearTimeout(swipeTimeout);
        if (longTapTimeout) clearTimeout(longTapTimeout);
        touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null;
        touch = {};
    }

    function isPrimaryTouch(event) {
        return (event.pointerType == 'touch' ||
            event.pointerType == event.MSPOINTER_TYPE_TOUCH)
            && event.isPrimary;
    }

    function isPointerEventType(e, type) {
        return (e.type == 'pointer' + type ||
            e.type.toLowerCase() == 'mspointer' + type);
    }

    (function () {
        var now, delta, deltaX = 0, deltaY = 0, firstTouch, _isPointerType;

        if ('MSGesture' in window) {
            gesture = new MSGesture();
            gesture.target = document.body;
        }

        $(document)
            .on('MSGestureEnd', function (e) {
                var swipeDirectionFromVelocity =
                    e.velocityX > 1 ? 'Right' : e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' : e.velocityY < -1 ? 'Up' : null;
                if (swipeDirectionFromVelocity) {
                    touch.el.trigger('swipe');
                    touch.el.trigger('swipe' + swipeDirectionFromVelocity);
                }
            })
            .on(_touchstart + ' MSPointerDown pointerdown', function (e) {
                if ((_isPointerType = isPointerEventType(e, 'down')) &&
                    !isPrimaryTouch(e)) return;
                firstTouch = _isPointerType || !isSupportTouch ? e : e.touches[0];
                if (e.touches && e.touches.length === 1 && touch.x2) {
                    // Clear out touch movement data if we have it sticking around
                    // This can occur if touchcancel doesn't fire due to preventDefault, etc.
                    touch.x2 = undefined;
                    touch.y2 = undefined;
                }
                now = Date.now();
                delta = now - (touch.last || now);
                touch.el = $('tagName' in firstTouch.target ?
                    firstTouch.target : firstTouch.target.parentNode);
                touchTimeout && clearTimeout(touchTimeout);
                touch.x1 = firstTouch.pageX;
                touch.y1 = firstTouch.pageY;
                if (delta > 0 && delta <= 250) touch.isDoubleTap = true;
                touch.last = now;
                longTapTimeout = setTimeout(longTap, longTapDelay);
                // adds the current touch contact for IE gesture recognition
                if (gesture && _isPointerType) gesture.addPointer(e.pointerId);
            })
            .on(_touchmove + ' MSPointerMove pointermove', function (e) {
                var moveX = moveY = 0;
                if ((_isPointerType = isPointerEventType(e, 'move')) &&
                    !isPrimaryTouch(e)) return;
                if (!touch.x1 && !touch.y1) return;
                firstTouch = _isPointerType || !isSupportTouch ? e : e.touches[0];

                touch.x2 = firstTouch.pageX;
                touch.y2 = firstTouch.pageY;
                moveX = Math.abs(touch.x1 - touch.x2);
                moveY = Math.abs(touch.y1 - touch.y2);
                deltaX += moveX;
                deltaY += moveY;
                if (moveX > 3 || moveY > 3) {
                    cancelLongTap();
                }
            })
            .on(_touchend + ' MSPointerUp pointerup', function (e) {
                if ((_isPointerType = isPointerEventType(e, 'up')) &&
                    !isPrimaryTouch(e)) return;
                cancelLongTap();

                // swipe
                if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                    (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

                    swipeTimeout = setTimeout(function () {
                        touch.el.trigger('swipe');
                        touch.el.trigger('swipe' + (direction(touch.x1, touch.x2, touch.y1, touch.y2)));
                        touch = {};
                    }, 0);

                // normal tap
                else if ('last' in touch)
                    // don't fire tap when delta position changed by more than 30 pixels,
                    // for instance when moving to a point and back to origin
                    if (deltaX < 30 && deltaY < 30) {
                        // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
                        // ('tap' fires before 'scroll')
                        tapTimeout = setTimeout(function () {

                            // trigger universal 'tap' with the option to cancelTouch()
                            // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
                            touch.el.trigger('tap', {'cancelTouch': cancelAll});

                            // trigger double tap immediately
                            if (touch.isDoubleTap) {
                                if (touch.el) touch.el.trigger('doubleTap');
                                touch = {};
                            }

                            // trigger single tap after 250ms of inactivity
                            else {
                                touchTimeout = setTimeout(function () {
                                    touchTimeout = null
                                    if (touch.el) touch.el.trigger('singleTap')
                                    touch = {}
                                }, 250);
                            }
                        }, 0);
                    } else {
                        touch = {};
                    }
                deltaX = deltaY = 0;

            })
            // when the browser window loses focus,
            // for example when a modal dialog is shown,
            // cancel all ongoing events
            .on('touchcancel MSPointerCancel pointercancel', cancelAll);

        // scrolling the window indicates intention of the user
        // to scroll, not tap or swipe, so cancel all ongoing events
        // $(window).on('scroll', cancelAll);
        window.addEventListener('scroll', cancelAll, false);
    })();

    ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
        'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function (eventName) {
            $.fn[eventName] = function (callback) { return this.on(eventName, callback) }
        });
})(window, xEvent);
