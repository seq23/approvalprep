// Print only the packet, never the app's navigation or private draft controls.
// Expo Print's web implementation calls window.print() and ignores its HTML option.
export async function saveOrPrintLetter(html: string, _action: 'save' | 'print'): Promise<void> {
  const frame = document.createElement('iframe');
  frame.title = 'Your letter for printing';
  frame.style.position = 'fixed';
  frame.style.width = '0'; frame.style.height = '0'; frame.style.border = '0';
  await new Promise<void>((resolve, reject) => {
    frame.onload = async () => {
      try {
        const target = frame.contentWindow;
        if (!target) throw new Error('The print window could not be opened. Please try again.');
        await frame.contentDocument?.fonts.ready;
        target.addEventListener('afterprint', () => frame.remove(), { once: true });
        target.focus(); target.print(); resolve();
      } catch (error) { frame.remove(); reject(error); }
    };
    frame.onerror = () => { frame.remove(); reject(new Error('The print window could not be opened. Please try again.')); };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
