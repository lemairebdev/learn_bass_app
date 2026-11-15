/**
 * Attach pointer selection to view elements and resolve each element's MIDI pitch.
 * Keyboard activation is intentionally outside the interaction contract.
 */
export function wirePointerSelection(elements, midiForElement, onSelect) {
  for (const element of elements) {
    element.addEventListener('click', () => {
      onSelect(Number(midiForElement(element)));
    });
  }
}
