#pragma once

#include <atomic>

namespace practice {
enum class Drill {
  None, Passing, Defending, Charged, Power, Chip, Finesse, Bicycle, ManualKeeper,
  CpuKeeper, Corner, FreeKick, Penalty, ThrowIn, GoalKick, Kickoff, Celebration
};

struct Scenario { Drill drill; const char* name; const char* hint; };
inline constexpr Scenario scenarios[] = {
    {Drill::Passing, "Passing & movement", "Move with WASD, sprint with Shift, right-click to pass."},
    {Drill::Defending, "Defensive switch", "Close down the ball carrier as your team switches defenders."},
    {Drill::Charged, "Charged shot", "Hold left mouse until the gauge turns red. Release to shoot."},
    {Drill::Power, "Rising power shot", "Take control of the ball, aim and tap T."},
    {Drill::Chip, "Chip shot", "Hold Q while charging and releasing left mouse to lift the ball."},
    {Drill::Finesse, "Finesse shot", "Hold C while charging and releasing left mouse for a placed shot."},
    {Drill::Bicycle, "Bicycle kick", "Press B as the cross reaches your player in the air."},
    {Drill::ManualKeeper, "Manual keeper", "Move the cursor onto the incoming ball just before it reaches goal."},
    {Drill::CpuKeeper, "CPU keeper", "Watch the CPU face the same shot as in Manual keeper."},
    {Drill::Corner, "Attacking corner", "Aim into the box. Hold and release F to cross."},
    {Drill::FreeKick, "Direct free kick", "Aim, then hold and release left mouse to take the free kick."},
    {Drill::Penalty, "Penalty kick", "Aim and shoot from the penalty spot against the keeper."},
    {Drill::ThrowIn, "Throw-in", "Aim at a teammate and right-click to take the throw."},
    {Drill::GoalKick, "Goal kick", "Play short with right mouse or hold F for a long clearance."},
    {Drill::Kickoff, "Kickoff", "Right-click to kick off, then play freely."},
    {Drill::Celebration, "Goal celebration", "Finish from close range to see the scorer camera."},
};

// Transient, local to the exhibition opened from Settings. Never written to the game config.
inline std::atomic<Drill> active{Drill::None};
inline const Scenario* Find(Drill drill) {
  for (const auto& scenario : scenarios)
    if (scenario.drill == drill) return &scenario;
  return nullptr;
}
}  // namespace practice
