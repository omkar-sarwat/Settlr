/**
 * Animated Background Orbs
 * 
 * Three large gradient orbs that slowly drift in the background.
 * These create depth behind glass cards and make the glassmorphism effect work.
 * 
 * The orbs never stop moving — they create a living, breathing background.
 * Movement is very slow (20-30 seconds per cycle) so it's not distracting.
 */

export function AnimatedOrbs() {
  return (
    <div className="bg-orbs">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
    </div>
  );
}
