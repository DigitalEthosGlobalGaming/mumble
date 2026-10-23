/* Shared by moustache and goatee. `mous` is drawn over the mouth, `chin` behind the face's lower edge. */
export const moustache = (m: number, fill: string) =>
  `<path d="M86,${m - 1} Q87,${m - 10} 100,${m - 8} Q113,${m - 10} 114,${m - 1} Q100,${m - 5} 86,${m - 1} Z" fill="${fill}"/>`;
