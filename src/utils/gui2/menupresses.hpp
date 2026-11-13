#pragma once

#include <SDL2/SDL.h>

#include <mutex>
#include <vector>

namespace blunted {

// SDL can deliver both down and up between menu ticks. Keep discrete presses in
// arrival order, separately from the held state used for movement and repeats.
struct MenuPress {
  SDL_Keycode key;
  float windowX, windowY;  // normalized client coordinates for a left click
};

inline bool IsMenuKey(SDL_Keycode key) {
  return key == SDLK_UP || key == SDLK_DOWN || key == SDLK_LEFT || key == SDLK_RIGHT ||
         key == SDLK_RETURN || key == SDLK_KP_ENTER || key == SDLK_ESCAPE;
}

class MenuPressQueue {
public:
  void Push(MenuPress press) {
    std::lock_guard<std::mutex> lock(mutex);
    presses.push_back(press);
  }
  std::vector<MenuPress> Take() {
    std::lock_guard<std::mutex> lock(mutex);
    std::vector<MenuPress> result;
    result.swap(presses);
    return result;
  }
private:
  std::mutex mutex;
  std::vector<MenuPress> presses;
};

inline MenuPressQueue menuPresses;
}  // namespace blunted
