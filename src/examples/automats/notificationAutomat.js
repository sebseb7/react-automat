import { Automat } from '../../lib/index.js';
import counterAutomat from './counterAutomat.js';

/**
 * Cascade example — notificationAutomat subscribes to counterAutomat.
 *
 * Every time the counter's state changes, the transform callback fires and
 * prepends a new notification message. This in turn calls notificationAutomat.setState,
 * which notifies all of notificationAutomat's own subscribers (e.g. <NotificationBar>).
 *
 * State: { messages: Array<{ id, text, time, count }> }
 */
const notificationAutomat = new Automat(
  { messages: [] },
  {
    clear() {
      notificationAutomat.setState({ messages: [] });
    },
    addNotice(text, count = 0) {
      const { messages } = notificationAutomat.getState();
      notificationAutomat.setState({
        messages: [
          {
            id: Date.now() + Math.random(),
            text,
            time: new Date().toLocaleTimeString(),
            count,
          },
          ...messages.slice(0, 9),
        ],
      });
    },
  }
);

// Wire the cascade: notificationAutomat derives state from counterAutomat:
notificationAutomat.subscribeTo(
  counterAutomat,
  (upstream, my) => ({
    messages: [
      {
        id: Date.now() + Math.random(),
        text: `Cascade trigger: counter changed to ${upstream.count}`,
        time: new Date().toLocaleTimeString(),
        count: upstream.count,
      },
      ...my.messages.slice(0, 9),
    ],
  })
);

export default notificationAutomat;
