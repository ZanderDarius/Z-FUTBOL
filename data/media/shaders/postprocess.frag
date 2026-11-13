#version 150

#pragma optimize(on)

uniform sampler2D map_accumulation; // 0
uniform sampler2D map_modifier;     // 1
uniform sampler2D map_depth;        // 2

uniform float contextWidth;
uniform float contextHeight;
uniform float contextX;
uniform float contextY;

uniform vec2 cameraClip;

uniform float fogScale;

out vec4 stdout;

// http://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/

#define GammaCorrection(color, gamma) pow(color, 1.0 / gamma)

// For all settings: 1.0 = 100% 0.5=50% 1.5 = 150%
vec3 ContrastSaturationBrightness(vec3 color, float brt, float con, float sat) {
  const vec3 LumCoeff = vec3(0.2125, 0.7154, 0.0721);
  // Increase or decrease these values to adjust r, g and b color channels seperately
  vec3 AvgLumin = vec3(0.5, 0.5, 0.5);
  vec3 brtColor = color * brt;
  vec3 intensity = vec3(dot(brtColor, LumCoeff));
  vec3 satColor = mix(intensity, brtColor, sat);
  vec3 conColor = mix(AvgLumin, satColor, con);

  return conColor;
}

vec3 AlternateContrast(vec3 color, float bias) {
  return color * (1.0f - bias) + (-cos(clamp(color, 0.0f, 1.0f) * 3.14159265f) * 0.5f + 0.5f) * bias;
}

vec3 Compress(vec3 color, float startThreshold, float endThreshold) {
  float range = endThreshold - startThreshold;
  float compressedRange = 1.0f - startThreshold;
  for (int c = 0; c < 3; c++) {
    if (color[c] > startThreshold) {
      color[c] = (color[c] - startThreshold) / range; // 0 to 1
      color[c] = pow(color[c], 0.5f);
      color[c] = startThreshold + color[c] * compressedRange;
    }
  }
  return color;
}


void main(void) {
  vec2 texCoord = gl_FragCoord.xy;
  texCoord.x -= contextX;
  texCoord.y -= contextY;
  texCoord.x /= contextWidth;
  texCoord.y /= contextHeight;

  // Keep color channels aligned to avoid red/cyan ghosting on high-contrast edges.
  vec4 accum = texture2D(map_accumulation, texCoord);
  accum.a = 1.0;

  vec3 base = accum.rgb;

  vec4 modifier = texture2D(map_modifier, texCoord);

  // edge blur
  if (modifier.r > 0.0) {
    vec3 smoothPixel = vec3(0);
    smoothPixel += texture2D(map_accumulation, texCoord + vec2(0, 1 / contextHeight)).xyz;
    smoothPixel += texture2D(map_accumulation, texCoord + vec2(1 / contextWidth, 0)).xyz;
    smoothPixel += texture2D(map_accumulation, texCoord + vec2(0, -1 / contextHeight)).xyz;
    smoothPixel += texture2D(map_accumulation, texCoord + vec2(-1 / contextWidth, 0)).xyz;
    smoothPixel *= 0.25;
    base = base * (1.0 - modifier.r) + smoothPixel * modifier.r;
    //base = base * (1.0 - modifier.r) + vec3(0, 0, 0) * modifier.r * 0.5 + smoothPixel * modifier.r * 0.5; // cartooney effect
    //base = base * (1.0 - modifier.r) + vec3(0, 0, 0) * modifier.r * 0.8 + smoothPixel * modifier.r * 0.2; // cartooney effect
  }


  // Depth-aware contact shadows keep the dark turf from bleeding onto white kits.
  float centerDepth = texture(map_depth, texCoord).r;
  vec2 texelSize = 1.0 / vec2(textureSize(map_modifier, 0));
  float total = 0.0;
  float SSAO = 0.0;
  for (int x = -1; x <= 1; ++x) {
    for (int y = -1; y <= 1; ++y) {
      vec2 uv = texCoord + vec2(x,y) * texelSize;
      float weight = 1.0 / (1.0 + 5000.0 * abs(texture(map_depth, uv).r - centerDepth));
      SSAO += texture(map_modifier, uv).g * weight;
      total += weight;
    }
  }
  SSAO /= total;
  vec3 fragColor = base * mix(0.20, 1.0, SSAO);

  // fog

  float depth = texture2D(map_depth, texCoord).x;

  // convert from non-linear to linear
  float fragDepth = cameraClip.y / (depth - cameraClip.x);

//  vec3 fogColor = vec3(0.84, 0.98, 1.0);
//  vec3 fogColor = vec3(1.0, 0.9, 0.86);
//  vec3 fogColor = vec3(0.85, 0.65, 1.0);
  vec3 fogColor = vec3(0.85, 0.85, 0.9);

  float fogFactor = clamp(fragDepth * 0.01f * (1.0f - fogScale) - 0.16f * fogScale, 0.0f, 0.25f);

  fragColor = fragColor * (1.0f - fogFactor) + fogColor * fogFactor;
  if (depth > 0.999f) fragColor = fogColor; // fill 'background'/sky

  // Neutral midtones, warm sun and a soft highlight roll-off on bright kits.
  float luma = dot(fragColor, vec3(0.2126, 0.7152, 0.0722));
  fragColor = mix(vec3(luma), fragColor, 1.12);
  fragColor *= mix(vec3(0.95,1.00,1.07), vec3(1.06,1.02,0.97), smoothstep(0.03,0.85,luma));
  fragColor = max(fragColor, vec3(0.0));
  fragColor = fragColor * 1.12 / (1.0 + 0.13 * fragColor);
  
  // Gentle broadcast vignette: keep touchlines and corner play readable.
  vec2 uv = texCoord * 2.0 - 1.0;
  float distSq = dot(uv, uv);
  float vignette = max(0.0, 1.0 - distSq * 0.025);
  fragColor *= vignette;
  
  // Subtle film grain (noise based on coordinates)
  float noise = fract(sin(dot(texCoord.xy ,vec2(12.9898,78.233))) * 43758.5453);
  fragColor += (noise - 0.5) / 255.0; // Zero-mean dither without darkening the pitch

  fragColor = clamp(fragColor, 0.0, 1.0);

  stdout = vec4(fragColor, 0);
}
