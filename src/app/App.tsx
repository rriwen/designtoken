import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Palette, 
  Type, 
  Square, 
  Layers, 
  Search, 
  FileJson,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Move,
  Download,
  History,
  X
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible';
import { Progress } from './components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import { primitives, semantics, components, typography, radius, shadow, spacing } from '../data/mockTokens';
// 导入 tokens 文件
import colorSeedTokensJson from '../data/token/color-seed.tokens.json';
import colorSemanticTokensJson from '../data/token/color-semantic.tokens.json';
import sizeTokensJson from '../data/token/size.tokens.json';
import fontZhTokensJson from '../data/token/font/中文.tokens.json';
import fontEnTokensJson from '../data/token/font/英文.tokens.json';
import fontJaTokensJson from '../data/token/font/日文.tokens.json';
// 导入更新记录
import updateLogsJson from '../data/update-logs.json';
// 为了兼容性，使用 tokens 文件作为 colorSeedJson 和 colorSemanticJson
const colorSeedJson = colorSeedTokensJson;
const colorSemanticJson = colorSemanticTokensJson;
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { toast } from 'sonner';
import { Toaster as Sonner } from 'sonner';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './components/ui/drawer';

// Types
type TokenType = 'color' | 'typography' | 'radius' | 'shadow' | 'spacing';
type TokenValue = { value: string; type: string; [key: string]: any };

const NAV_ITEMS = [
  { id: 'primitives', label: '基础颜色', icon: Palette },
  { id: 'semantics', label: '语义颜色', icon: Palette },
  { id: 'typography', label: '文本', icon: Type },
  { id: 'radius', label: '圆角', icon: Square },
  { id: 'spacing', label: '间距', icon: Move },
  { id: 'shadow', label: '阴影', icon: Layers },
] as const;

// 根据 groupName 获取对应的导航标签
const getGroupLabel = (groupName: string): string => {
  const navItem = NAV_ITEMS.find(item => item.id === groupName);
  return navItem?.label || `${groupName}.json`;
};

// 根据 groupName 获取对应的导航图标
const getGroupIcon = (groupName: string) => {
  const navItem = NAV_ITEMS.find(item => item.id === groupName);
  return navItem?.icon || FileJson;
};

// Helper to build a map from variable name to code syntax from color-seed.json
const buildColorSeedCodeSyntaxMap = (colorSeedJson: any): Record<string, string> => {
  const map: Record<string, string> = {};
  
  for (const key in colorSeedJson) {
    const token = colorSeedJson[key];
    if (token?.$extensions?.['com.figma.codeSyntax']?.WEB) {
      map[key] = token.$extensions['com.figma.codeSyntax'].WEB;
    }
  }
  
  return map;
};

// Helper to build a reverse map from code syntax to variable name
const buildCodeSyntaxToVariableMap = (colorSeedJson: any): Record<string, string> => {
  const map: Record<string, string> = {};
  
  for (const key in colorSeedJson) {
    const token = colorSeedJson[key];
    if (token?.$extensions?.['com.figma.codeSyntax']?.WEB) {
      map[token.$extensions['com.figma.codeSyntax'].WEB] = key;
    }
  }
  
  return map;
};

// Helper to build a map from variable name to color data (hex and alpha) from color-seed.json
const buildColorSeedColorMap = (colorSeedJson: any): Record<string, { hex: string; alpha: number }> => {
  const map: Record<string, { hex: string; alpha: number }> = {};
  
  for (const key in colorSeedJson) {
    const token = colorSeedJson[key];
    if (token?.$value?.hex !== undefined) {
      map[key] = {
        hex: token.$value.hex || '#000000',
        alpha: token.$value.alpha !== undefined ? token.$value.alpha : 1
      };
    }
  }
  
  return map;
};

// Helper to parse Figma variables JSON format
const parseFigmaVariables = (figmaJson: any): any => {
  const result: any = {};
  
  for (const key in figmaJson) {
    const token = figmaJson[key];
    
    // Check if it's a Figma variable format
    if (token.$type === 'color' && token.$value && token.$extensions) {
      const hex = token.$value.hex || '#000000';
      const alpha = token.$value.alpha !== undefined ? token.$value.alpha : 1;
      
      // Convert hex + alpha to rgba if alpha is not 1
      let colorValue = hex;
      if (alpha < 1) {
        // Convert hex to rgb
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        colorValue = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      
      // Get code syntax from extensions
      const codeSyntax = token.$extensions?.['com.figma.codeSyntax']?.WEB || '';
      
      // Store with code syntax in the value object
      result[key] = {
        value: colorValue,
        type: 'color',
        codeSyntax: codeSyntax
      };
    } else {
      // Not a Figma format, keep as is (for backward compatibility)
      result[key] = token;
    }
  }
  
  return result;
};

// Helper to parse radius tokens from size.tokens.json
const parseRadiusTokens = (sizeJson: any): any => {
  const result: any = {};
  
  if (!sizeJson || !sizeJson.radius) {
    return result;
  }
  
  const radiusData = sizeJson.radius;
  
  for (const key in radiusData) {
    const token = radiusData[key];
    if (token && token.$type === 'number' && token.$value !== undefined) {
      // variable 为 {分类1}-{分类2}，这里分类1是 "radius"，分类2是 key (如 "SM", "MD", "LG")
      const variable = `radius-${key}`;
      // code syntax 为 variable 的值加前缀 "--ob-"
      const codeSyntax = `--ob-${variable}`;
      // value 取自 "$value"
      const value = token.$value;
      
      result[variable] = {
        value: value,
        type: 'radius',
        codeSyntax: codeSyntax
      };
    }
  }
  
  return result;
};

// Helper to parse spacing tokens from size.tokens.json
const parseSpacingTokens = (sizeJson: any): any => {
  const result: any = {};
  
  if (!sizeJson || !sizeJson.space) {
    return result;
  }
  
  const spaceData = sizeJson.space;
  
  for (const key in spaceData) {
    const token = spaceData[key];
    if (token && token.$type === 'number' && token.$value !== undefined) {
      // variable 为 {分类1}-{分类2}，这里分类1是 "space"，分类2是 key (如 "50", "100", "150")
      const variable = `space-${key}`;
      // code syntax 为 variable 的值加前缀 "--ob-"
      const codeSyntax = `--ob-${variable}`;
      // value 取自 "$value"
      const value = token.$value;
      
      result[variable] = {
        value: value,
        type: 'spacing',
        codeSyntax: codeSyntax
      };
    }
  }
  
  return result;
};

// Helper to parse typography tokens from font files
const parseTypographyTokens = (fontJson: any): any => {
  const result: any = {
    family: {},
    weight: {},
    size: {},
    'line-height': {}
  };
  
  if (!fontJson) {
    return result;
  }
  
  // 解析 family（字体）
  if (fontJson.family) {
    for (const key in fontJson.family) {
      const token = fontJson.family[key];
      if (token && token.$value !== undefined) {
        const variable = `font-family-${key}`;
        const codeSyntax = `--ob-${variable}`;
        const value = token.$value;
        
        result.family[variable] = {
          value: value,
          type: 'typography',
          codeSyntax: codeSyntax
        };
      }
    }
  }
  
  // 解析 weight（字重）
  if (fontJson.weight) {
    for (const key in fontJson.weight) {
      const token = fontJson.weight[key];
      if (token && token.$value !== undefined) {
        const variable = `font-weight-${key}`;
        const codeSyntax = `--ob-${variable}`;
        const value = token.$value;
        
        result.weight[variable] = {
          value: value,
          type: 'typography',
          codeSyntax: codeSyntax
        };
      }
    }
  }
  
  // 解析 size（字号）
  if (fontJson.size) {
    for (const key in fontJson.size) {
      const token = fontJson.size[key];
      if (token && token.$type === 'number' && token.$value !== undefined) {
        const variable = `font-size-${key}`;
        const codeSyntax = `--ob-${variable}`;
        const value = token.$value;
        
        result.size[variable] = {
          value: value,
          type: 'typography',
          codeSyntax: codeSyntax
        };
      }
    }
  }
  
  // 解析 line-height（行高）
  if (fontJson['line-height']) {
    for (const key in fontJson['line-height']) {
      const token = fontJson['line-height'][key];
      if (token && token.$type === 'number' && token.$value !== undefined) {
        const variable = `font-line-height-${key}`;
        const codeSyntax = `--ob-${variable}`;
        const value = token.$value;
        
        result['line-height'][variable] = {
          value: value,
          type: 'typography',
          codeSyntax: codeSyntax
        };
      }
    }
  }
  
  return result;
};

// Helper to parse semantic tokens from color-semantic.json
const parseSemanticTokens = (semanticJson: any, colorSeedCodeSyntaxMap: Record<string, string>, colorSeedColorMap: Record<string, { hex: string; alpha: number }>): any => {
  const result: any = {};
  
  const traverse = (obj: any, path: string[] = []) => {
    for (const key in obj) {
      // Skip $extensions and other metadata keys at root level
      if (key.startsWith('$')) {
        continue;
      }
      
      const currentPath = [...path, key];
      const value = obj[key];
      
      if (value?.$type === 'color' && value?.$extensions) {
        // It's a semantic token
        const codeSyntax = value.$extensions?.['com.figma.codeSyntax']?.WEB || '';
        const targetVariableName = value.$extensions?.['com.figma.aliasData']?.targetVariableName;
        
        // Generate variable name: color-{分类1}-{分类2}
        const variableName = `color-${currentPath.join('-')}`;
        
        // Get value from color-seed code syntax map
        let tokenValue = '';
        if (targetVariableName && colorSeedCodeSyntaxMap[targetVariableName]) {
          tokenValue = colorSeedCodeSyntaxMap[targetVariableName];
        }
        
        // Get color data (hex and alpha) from color-seed for preview
        let colorHex = '';
        let colorAlpha = 1;
        if (targetVariableName && colorSeedColorMap[targetVariableName]) {
          colorHex = colorSeedColorMap[targetVariableName].hex;
          colorAlpha = colorSeedColorMap[targetVariableName].alpha;
        }
        
        // Build nested structure for compatibility with flattenTokens
        let current = result;
        for (let i = 0; i < currentPath.length - 1; i++) {
          if (!current[currentPath[i]]) {
            current[currentPath[i]] = {};
          }
          current = current[currentPath[i]];
        }
        
        current[currentPath[currentPath.length - 1]] = {
          value: tokenValue,
          type: 'color',
          codeSyntax: codeSyntax,
          // Store the generated variable name for reference
          _variableName: variableName,
          // Store color data for preview
          _colorHex: colorHex,
          _colorAlpha: colorAlpha
        };
      } else if (typeof value === 'object' && value !== null && !value.$type && !Array.isArray(value)) {
        // It's a nested group, continue traversing
        traverse(value, currentPath);
      }
    }
  };
  
  traverse(semanticJson);
  return result;
};

// Helper to flatten tokens for table display
const flattenTokens = (data: any, prefix = '', groupName?: string): { name: string; value: string; codeSyntax?: string; path: string[]; colorHex?: string; colorAlpha?: number }[] => {
  let result: any[] = [];
  for (const key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      if ('value' in data[key]) {
        // It's a token
        // For semantics group, use _variableName if available, otherwise use color-{path}
        let tokenName: string;
        if (groupName === 'semantics' && data[key]._variableName) {
          tokenName = data[key]._variableName;
        } else if (groupName === 'semantics') {
          // Generate color-{分类1}-{分类2} format
          const pathParts = prefix ? [...prefix.split('.'), key] : [key];
          tokenName = `color-${pathParts.join('-')}`;
        } else {
          tokenName = prefix ? `${prefix}.${key}` : key;
        }
        
        // For shadow group, ensure codeSyntax has --ob- prefix if not provided
        let codeSyntax = data[key].codeSyntax;
        if (!codeSyntax && groupName === 'shadow') {
          codeSyntax = `--ob-${tokenName.replace(/\./g, '-')}`;
        }
        
        // Convert value to string for display
        const tokenValue = data[key].value != null ? String(data[key].value) : '';
        
        result.push({
          name: tokenName,
          value: tokenValue,
          codeSyntax: codeSyntax,
          path: prefix ? [...prefix.split('.'), key] : [key],
          colorHex: data[key]._colorHex,
          colorAlpha: data[key]._colorAlpha
        });
      } else {
        // It's a group
        result = result.concat(flattenTokens(data[key], prefix ? `${prefix}.${key}` : key, groupName));
      }
    }
  }
  return result;
};

// Helper to resolve reference values recursively
const resolveColorValue = (value: string, tokenMap: Record<string, string>): string => {
  if (!value) return '';
  if (value.startsWith('{') && value.endsWith('}')) {
    const refKey = value.slice(1, -1);
    if (tokenMap[refKey]) return resolveColorValue(tokenMap[refKey], tokenMap);
    const foundKey = Object.keys(tokenMap).find(k => k.endsWith(refKey) || k === refKey);
    if (foundKey) return resolveColorValue(tokenMap[foundKey], tokenMap);
    return '';
  }
  return value;
};

// Helper function to copy text to clipboard
const copyToClipboard = async (text: string, label: string = 'Text') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  } catch (err) {
    console.error('Failed to copy:', err);
    toast.error('Failed to copy to clipboard');
  }
};

// Helper to convert CSS variable to JS format
const convertToJS = (cssVar: string): string => {
  if (!cssVar.startsWith('--ob-')) {
    return cssVar; // Return as-is if not a CSS variable
  }
  
  // Remove --ob- prefix
  const withoutPrefix = cssVar.replace(/^--ob-/, '');
  
  // Split by hyphens and convert to camelCase
  const parts = withoutPrefix.split('-');
  
  // Convert to camelCase: first part lowercase, subsequent parts capitalized
  const camelCase = parts.map((part, index) => {
    if (index === 0) {
      return part; // First part stays lowercase
    }
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('');
  
  return camelCase;
};

// Helper to format value based on code language
// If value is a CSS variable reference (starts with --), convert it in JS format
const formatValue = (value: string, codeLanguage: 'css' | 'js'): string => {
  if (codeLanguage === 'js' && typeof value === 'string' && value.startsWith('--')) {
    return convertToJS(value);
  }
  return value;
};

// Code Syntax cell component with hover copy
const CodeSyntaxCell = ({ codeSyntax, codeLanguage = 'css' }: { codeSyntax: string; codeLanguage?: 'css' | 'js' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Convert code syntax based on language
  const displaySyntax = codeLanguage === 'js' ? convertToJS(codeSyntax) : codeSyntax;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(displaySyntax, 'Code syntax');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div 
      className="relative inline-flex items-center gap-2 group/code w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="select-all">{displaySyntax}</span>
      <button
        onClick={handleCopy}
        className={`inline-flex items-center justify-center w-5 h-5 rounded hover:bg-blue-100 active:bg-blue-200 transition-opacity cursor-pointer flex-shrink-0 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="Click to copy code syntax"
        aria-label="Copy code syntax"
      >
        {isCopied ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-blue-600 opacity-70 hover:opacity-100 transition-opacity" />
        )}
      </button>
    </div>
  );
};

const ColorSwatch = ({ value, tokenMap, colorHex, colorAlpha }: { value: string, tokenMap: Record<string, string>, colorHex?: string, colorAlpha?: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const resolved = resolveColorValue(value, tokenMap);
  const isResolved = resolved && resolved !== value;
  const isValidColor = (c: string) => c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl') || c === 'transparent';
  
  // If colorHex and colorAlpha are provided (for semantic tokens), use them for preview
  let colorValue: string;
  if (colorHex) {
    if (colorAlpha !== undefined && colorAlpha < 1) {
      // Convert hex to rgba
      const r = parseInt(colorHex.slice(1, 3), 16);
      const g = parseInt(colorHex.slice(3, 5), 16);
      const b = parseInt(colorHex.slice(5, 7), 16);
      colorValue = `rgba(${r}, ${g}, ${b}, ${colorAlpha})`;
    } else {
      colorValue = colorHex;
    }
  } else {
    colorValue = resolved || value;
  }
  
  if (!isValidColor(value) && !isValidColor(resolved) && !colorHex) {
    return <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">?</div>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(colorValue, 'Color value');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div 
      className="flex items-center gap-2 justify-end relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover tooltip showing color value */}
      {isHovered && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-mono rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
          {colorValue}
        </div>
      )}
      
      {/* Color swatch with click to copy */}
      <div 
        className="w-8 h-8 rounded border border-gray-200 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-110 hover:shadow-md group/color"
        onClick={handleCopy}
        title="Click to copy color value"
      >
        {/* Checkerboard pattern for transparency */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=')] opacity-10" />
        {/* Color background */}
        <div className="absolute inset-0" style={{ backgroundColor: colorValue }} />
        {/* Copy icon overlay on hover */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            {isCopied ? (
              <Check className="w-4 h-4 text-white drop-shadow-lg" />
            ) : (
              <Copy className="w-4 h-4 text-white drop-shadow-lg" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ShadowPreview = ({ value }: { value: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Parse and normalize shadow value
  // Format: "hsla(219,50,15,0.1) 0PX -1PX 2PX 0PX"
  // Convert to standard CSS format: "hsla(219, 50%, 15%, 0.1) 0px -1px 2px 0px"
  const parseShadowValue = (val: string): string => {
    // Match hsla/rgba color followed by coordinates
    const shadowMatch = val.match(/^(hsla?|rgba?)\(([^)]+)\)\s*(.+)$/i);
    
    if (!shadowMatch) {
      // If no match, just normalize PX to px
      return val.replace(/PX/g, 'px');
    }
    
    const colorType = shadowMatch[1].toLowerCase();
    const colorValues = shadowMatch[2];
    const coordinates = shadowMatch[3].trim();
    
    // Normalize coordinates: PX to px
    const normalizedCoords = coordinates.replace(/PX/g, 'px');
    
    // Handle hsla format - ensure s and l have % if they don't
    if (colorType === 'hsla' || colorType === 'hsl') {
      // Parse hsla values: h, s, l, a
      const values = colorValues.split(',').map(v => v.trim());
      
      if (values.length >= 3) {
        const h = values[0];
        const s = values[1];
        const l = values[2];
        const a = values[3] || '1';
        
        // Add % to s and l if they don't have it
        const sNormalized = s.includes('%') ? s : `${s}%`;
        const lNormalized = l.includes('%') ? l : `${l}%`;
        
        // Reconstruct hsla with proper formatting
        const normalizedColor = `${colorType}(${h}, ${sNormalized}, ${lNormalized}, ${a})`;
        return `${normalizedColor} ${normalizedCoords}`;
      }
    }
    
    // For rgba or other formats, just normalize spacing and PX
    return `${colorType}(${colorValues}) ${normalizedCoords}`;
  };
  
  const normalizedValue = parseShadowValue(value);
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(normalizedValue, 'Shadow value');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div 
      className="flex items-center gap-2 justify-end relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover tooltip showing shadow value */}
      {isHovered && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-mono rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
          {normalizedValue}
        </div>
      )}
      
      {/* Shadow preview with click to copy - no border */}
      <div 
        className="w-8 h-8 rounded bg-white relative overflow-visible cursor-pointer transition-all hover:scale-110 group/shadow"
        style={{ boxShadow: normalizedValue }}
        onClick={handleCopy}
        title="Click to copy shadow value"
      >
        {/* Copy icon overlay on hover */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded">
            {isCopied ? (
              <Check className="w-4 h-4 text-white drop-shadow-lg" />
            ) : (
              <Copy className="w-4 h-4 text-white drop-shadow-lg" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Component for a collapsible token group
// 辅助函数：获取 typography token 信息用于 Tooltip
const getTypographyTokenInfo = (tokens: Record<string, any>, codeSyntax: string) => {
  if (!tokens.typography) return null;
  
  // 从 codeSyntax 中提取 variable 名称（去掉 --ob- 前缀）
  const variable = codeSyntax.replace('--ob-', '');
  
  // 在 typography 数据中查找对应的 token
  const typographyData = tokens.typography;
  
  // 检查 family, weight, size, line-height
  if (typographyData.family && typographyData.family[variable]) {
    return typographyData.family[variable];
  }
  if (typographyData.weight && typographyData.weight[variable]) {
    return typographyData.weight[variable];
  }
  if (typographyData.size && typographyData.size[variable]) {
    return typographyData.size[variable];
  }
  if (typographyData['line-height'] && typographyData['line-height'][variable]) {
    return typographyData['line-height'][variable];
  }
  
  return null;
};

// Typography Token Tooltip 组件
const TypographyTokenTooltip = ({ 
  tokens, 
  codeSyntax, 
  codeLanguage,
  children 
}: { 
  tokens: Record<string, any>; 
  codeSyntax: string; 
  codeLanguage: 'css' | 'js';
  children: React.ReactNode;
}) => {
  const tokenInfo = getTypographyTokenInfo(tokens, codeSyntax);
  
  if (!tokenInfo) {
    return <>{children}</>;
  }
  
  const variable = codeSyntax.replace('--ob-', '');
  const displayCodeSyntax = codeLanguage === 'js' ? convertToJS(codeSyntax) : codeSyntax;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="bg-slate-900 text-white p-3 max-w-xs"
        sideOffset={5}
      >
        <div className="space-y-1.5 text-xs">
          <div>
            <span className="text-slate-400">Variable: </span>
            <span className="font-mono text-white">{variable}</span>
          </div>
          <div>
            <span className="text-slate-400">Code Syntax: </span>
            <span className="font-mono text-blue-300">{displayCodeSyntax}</span>
          </div>
          <div>
            <span className="text-slate-400">Value: </span>
            <span className="font-mono text-white">{tokenInfo.value}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const TokenGroup = ({ 
  groupName, 
  items, 
  tokenMap,
  onUpdate,
  displayTitle,
  defaultOpen = false,
  categoryItems,
  highlightedToken,
  tokenRowRefs,
  onSemanticValueClick,
  hideActions = false,
  typographyLanguage,
  onTypographyLanguageChange,
  codeLanguage = 'css',
  tokens
}: { 
  groupName: string; 
  items: { name: string; value: string; path: string[] }[]; 
  tokenMap: Record<string, string>;
  onUpdate: (data: any) => void;
  displayTitle?: string;
  defaultOpen?: boolean;
  categoryItems?: Record<string, { name: string; value: string; path: string[]; codeSyntax?: string; colorHex?: string; colorAlpha?: number }[]>;
  highlightedToken?: string | null;
  tokenRowRefs?: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  onSemanticValueClick?: (value: string) => void;
  hideActions?: boolean;
  typographyLanguage?: 'en' | 'zh' | 'ja';
  onTypographyLanguageChange?: (lang: 'en' | 'zh' | 'ja') => void;
  codeLanguage?: 'css' | 'js';
  tokens?: Record<string, any>;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);

  const handleRefresh = async () => {
    // 根据 groupName 确定要读取的文件
    let rawJson: any;
    if (groupName === 'primitives') {
      rawJson = colorSeedTokensJson;
    } else if (groupName === 'semantics') {
      rawJson = colorSemanticTokensJson;
    } else if (groupName === 'radius') {
      rawJson = sizeTokensJson;
    } else if (groupName === 'spacing') {
      rawJson = sizeTokensJson;
    } else if (groupName === 'typography') {
      // 根据语言选择对应的字体文件
      if (typographyLanguage === 'zh') {
        rawJson = fontZhTokensJson;
      } else if (typographyLanguage === 'ja') {
        rawJson = fontJaTokensJson;
      } else {
        rawJson = fontEnTokensJson;
      }
    } else {
      toast.error('该组不支持刷新操作');
      return;
    }

    setIsParsing(true);
    setParseProgress(0);

    // 模拟读取进度
    const progressInterval = setInterval(() => {
      setParseProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 50);

    // 使用setTimeout模拟JSON解析过程
    setTimeout(() => {
      try {
        setParseProgress(95);
        
        let parsedJson: any;
        
        // Check if it's semantic token format (has nested structure with aliasData)
        const isSemanticFormat = rawJson && typeof rawJson === 'object' && 
          (() => {
            // Check if it has nested structure and contains aliasData
            for (const key in rawJson) {
              if (key.startsWith('$')) continue;
              const value = rawJson[key];
              if (typeof value === 'object' && value !== null) {
                // Check nested structure
                for (const nestedKey in value) {
                  const nestedValue = value[nestedKey];
                  if (nestedValue?.$extensions?.['com.figma.aliasData']?.targetVariableName) {
                    return true;
                  }
                }
              }
            }
            return false;
          })();
        
        if (groupName === 'radius') {
          // Parse radius tokens from size.tokens.json
          parsedJson = parseRadiusTokens(rawJson);
        } else if (groupName === 'spacing') {
          // Parse spacing tokens from size.tokens.json
          parsedJson = parseSpacingTokens(rawJson);
        } else if (groupName === 'typography') {
          // Parse typography tokens from font files
          parsedJson = parseTypographyTokens(rawJson);
        } else if (isSemanticFormat && groupName === 'semantics') {
          // It's a semantic token file, parse it with color-seed mapping
          const colorSeedCodeSyntaxMap = buildColorSeedCodeSyntaxMap(colorSeedJson);
          const colorSeedColorMap = buildColorSeedColorMap(colorSeedJson);
          parsedJson = parseSemanticTokens(rawJson, colorSeedCodeSyntaxMap, colorSeedColorMap);
        } else {
          // Check if it's Figma variables format (flat structure) and parse it
          const isFigmaFormat = rawJson && typeof rawJson === 'object' && 
            Object.values(rawJson).some((item: any) => 
              item?.$type === 'color' && item?.$value && item?.$extensions && !item?.$extensions?.['com.figma.aliasData']
            );
          
          parsedJson = isFigmaFormat ? parseFigmaVariables(rawJson) : rawJson;
        }
        
        clearInterval(progressInterval);
        setParseProgress(100);
        
        // 短暂延迟后更新数据并隐藏进度
        setTimeout(() => {
          onUpdate(parsedJson);
          setIsParsing(false);
          setParseProgress(0);
        }, 200);
      } catch (error) {
        clearInterval(progressInterval);
        console.error("Invalid JSON", error);
        setIsParsing(false);
        setParseProgress(0);
        toast.error("JSON 文件格式无效，请检查文件内容");
      }
    }, 100);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 pr-4">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex-1 px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors text-left border-none bg-transparent">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <div className="flex items-center gap-2">
              {React.createElement(getGroupIcon(groupName), { className: "w-4 h-4 text-blue-500" })}
              <h3 className="font-semibold text-slate-900 text-xs">
                {displayTitle || getGroupLabel(groupName)}
              </h3>
            </div>
          </button>
        </CollapsibleTrigger>
        
        <div className="flex items-center gap-2 pr-2">
          {groupName === 'typography' && typographyLanguage !== undefined && onTypographyLanguageChange && (
            <Select value={typographyLanguage} onValueChange={(value: 'en' | 'zh' | 'ja') => {
              onTypographyLanguageChange(value);
              // 语言切换时自动刷新数据（通过 useEffect 处理）
            }}>
              <SelectTrigger className="h-6 w-24 text-[10px] px-2 border-slate-200 bg-white">
                <SelectValue>
                  {typographyLanguage === 'en' ? 'English' : typographyLanguage === 'zh' ? '中文' : '日本語'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          )}
          
        </div>
        
      </div>
      
      {/* 解析进度条 */}
      {isParsing && (
        <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-blue-700">正在解析 JSON 文件...</span>
                <span className="text-[10px] text-blue-600">{parseProgress}%</span>
              </div>
              <Progress value={parseProgress} className="h-1.5" />
            </div>
          </div>
        </div>
      )}
      
      <CollapsibleContent>
        {groupName === 'typography' ? (
          // Typography 特殊显示：先显示静态字体样式表格，再显示分类表格
          <div className="space-y-6 p-6">
            {/* 静态字体样式表格 */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 px-2">字体样式</h4>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/30">
                    <TableHead className="w-[12%] pl-6 text-[11px]">Variable</TableHead>
                    <TableHead className="w-[12%] text-[11px]">Code Syntax</TableHead>
                    <TableHead className="w-[20%] text-[11px]">Desc</TableHead>
                    <TableHead className="w-[14%] text-[11px]">字体</TableHead>
                    <TableHead className="w-[14%] text-[11px]">字重</TableHead>
                    <TableHead className="w-[14%] text-[11px]">字号</TableHead>
                    <TableHead className="w-[14%] text-[11px]">行高</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const fontH1 = 'font-h1';
                    return (
                      <TableRow className="group">
                        <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                          {fontH1}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                          <CodeSyntaxCell codeSyntax={`--ob-${fontH1}`} codeLanguage={codeLanguage} />
                        </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      页容器一级标题
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-size-500" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-size-500" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-size-500" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-line-height-700" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-line-height-700" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-line-height-700" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                  </TableRow>
                    );
                  })()}
                  {(() => {
                    const fontH2 = 'font-h2';
                    return (
                      <TableRow className="group">
                        <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                          {fontH2}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                          <CodeSyntaxCell codeSyntax={`--ob-${fontH2}`} codeLanguage={codeLanguage} />
                        </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      页容器二级标题、抽屉弹窗标题
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-size-450" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-size-450" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-size-450" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-line-height-650" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-line-height-650" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-line-height-650" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                  </TableRow>
                    );
                  })()}
                  {(() => {
                    const fontH3 = 'font-h3';
                    return (
                      <TableRow className="group">
                        <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                          {fontH3}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                          <CodeSyntaxCell codeSyntax={`--ob-${fontH3}`} codeLanguage={codeLanguage} />
                        </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      卡片标题、表单一级分组标题
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-size-400" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-size-400" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-size-400" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-line-height-600" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-line-height-600" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-line-height-600" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                  </TableRow>
                    );
                  })()}
                  {(() => {
                    const fontH4 = 'font-h4';
                    return (
                      <TableRow className="group">
                        <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                          {fontH4}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                          <CodeSyntaxCell codeSyntax={`--ob-${fontH4}`} codeLanguage={codeLanguage} />
                        </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      表单二级分组标题
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-weight-l" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-size-325" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-size-325" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-size-325" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                  </TableRow>
                    );
                  })()}
                  {(() => {
                    const fontBody1 = 'font-body1';
                    return (
                      <TableRow className="group">
                        <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                          {fontBody1}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                          <CodeSyntaxCell codeSyntax={`--ob-${fontBody1}`} codeLanguage={codeLanguage} />
                        </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      常规正文
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-weight-m" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-weight-m" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-weight-m" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-size-325" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-size-325" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-size-325" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                  </TableRow>
                    );
                  })()}
                  {(() => {
                    const fontBody2 = 'font-body2';
                    return (
                      <TableRow className="group">
                        <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                          {fontBody2}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                          <CodeSyntaxCell codeSyntax={`--ob-${fontBody2}`} codeLanguage={codeLanguage} />
                        </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      表格文本
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      <CodeSyntaxCell codeSyntax="--ob-font-weight-s" codeLanguage={codeLanguage} />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      <CodeSyntaxCell codeSyntax="--ob-font-size-300" codeLanguage={codeLanguage} />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      <CodeSyntaxCell codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage} />
                    </TableCell>
                  </TableRow>
                    );
                  })()}
                  {(() => {
                    const fontCaption = 'font-caption';
                    return (
                      <TableRow className="group">
                        <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                          {fontCaption}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                          <CodeSyntaxCell codeSyntax={`--ob-${fontCaption}`} codeLanguage={codeLanguage} />
                        </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      描述
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-family-default" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-weight-s" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-weight-s" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-weight-s" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-size-300" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-size-300" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-size-300" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      {tokens ? (
                        <TypographyTokenTooltip tokens={tokens} codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage}>
                          <CodeSyntaxCell codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage} />
                        </TypographyTokenTooltip>
                      ) : (
                        <CodeSyntaxCell codeSyntax="--ob-font-line-height-500" codeLanguage={codeLanguage} />
                      )}
                    </TableCell>
                  </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
            
            {/* 分类表格 */}
            {categoryItems && (
              <div className="space-y-6">
            {Object.entries(categoryItems).map(([category, categoryItemsList]) => {
              const categoryTitles: Record<string, string> = {
                'bg': '背景色',
                'border': '边框色',
                'text': '文本色',
                'icon': '图标色',
                'family': '字体',
                'weight': '字重',
                'size': '字号',
                'line-height': '行高'
              };
              
              if (categoryItemsList.length === 0) return null;
              
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 px-2">
                    {categoryTitles[category] || category}
                  </h4>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/30">
                        <TableHead className={groupName === 'typography' ? "w-[40%] pl-6 text-[11px]" : "w-[30%] pl-6 text-[11px]"}>Variable</TableHead>
                        <TableHead className={groupName === 'typography' ? "w-[30%] text-[11px]" : "w-[30%] text-[11px]"}>Code Syntax</TableHead>
                        <TableHead className={groupName === 'typography' ? "w-[30%] text-[11px]" : "w-[30%] text-[11px]"}>Value</TableHead>
                        {groupName !== 'typography' && (
                          <TableHead className="w-[10%] text-right pr-6 text-[11px]">Preview</TableHead>
                        )}
              </TableRow>
            </TableHeader>
            <TableBody>
                      {categoryItemsList.map((token) => {
                        const variableName = token.name;
                        const codeSyntax = token.codeSyntax || (groupName === 'shadow' ? `--ob-${token.name.replace(/\./g, '-')}` : `--${token.name.replace(/\./g, '-')}`);
                return (
                  <TableRow key={token.name} className="group">
                            <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                      {variableName}
                    </TableCell>
                            <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                              <CodeSyntaxCell codeSyntax={codeSyntax} codeLanguage={codeLanguage} />
                    </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                              <div className="flex items-center gap-2">
                                <span 
                                  className={`select-all ${token.value && typeof token.value === 'string' && token.value.startsWith('--') ? 'cursor-pointer hover:text-blue-600 hover:underline transition-colors' : ''}`}
                                  onClick={() => token.value && typeof token.value === 'string' && token.value.startsWith('--') && onSemanticValueClick?.(token.value)}
                                  title={token.value && typeof token.value === 'string' && token.value.startsWith('--') ? '点击定位到对应的基础颜色' : ''}
                                >
                                  {formatValue(token.value, codeLanguage)}
                                </span>
                                {typeof token.value === 'string' && token.value.startsWith('{') && (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                                    Alias
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            {groupName !== 'typography' && (
                              <TableCell className="text-right pr-6 py-3">
                                {groupName === 'shadow' ? (
                                  <ShadowPreview value={token.value} />
                                ) : (
                                  <ColorSwatch value={token.value} tokenMap={tokenMap} colorHex={token.colorHex} colorAlpha={token.colorAlpha} />
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
              </div>
            )}
          </div>
        ) : categoryItems ? (
          // 如果有categoryItems，显示多个表格（用于语义token）
          <div className="space-y-6 p-6">
            {Object.entries(categoryItems).map(([category, categoryItemsList]) => {
              const categoryTitles: Record<string, string> = {
                'bg': '背景色',
                'border': '边框色',
                'text': '文本色',
                'icon': '图标色',
                'family': '字体',
                'weight': '字重',
                'size': '字号',
                'line-height': '行高'
              };
              
              if (categoryItemsList.length === 0) return null;
              
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 px-2">
                    {categoryTitles[category] || category}
                  </h4>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/30">
                        <TableHead className={groupName === 'typography' ? "w-[40%] pl-6 text-[11px]" : "w-[30%] pl-6 text-[11px]"}>Variable</TableHead>
                        <TableHead className={groupName === 'typography' ? "w-[30%] text-[11px]" : "w-[30%] text-[11px]"}>Code Syntax</TableHead>
                        <TableHead className={groupName === 'typography' ? "w-[30%] text-[11px]" : "w-[30%] text-[11px]"}>Value</TableHead>
                        {groupName !== 'typography' && (
                          <TableHead className="w-[10%] text-right pr-6 text-[11px]">Preview</TableHead>
                        )}
              </TableRow>
            </TableHeader>
            <TableBody>
                      {categoryItemsList.map((token) => {
                        const variableName = token.name;
                        const codeSyntax = token.codeSyntax || (groupName === 'shadow' ? `--ob-${token.name.replace(/\./g, '-')}` : `--${token.name.replace(/\./g, '-')}`);
                return (
                  <TableRow key={token.name} className="group">
                            <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                      {variableName}
                    </TableCell>
                            <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                              <CodeSyntaxCell codeSyntax={codeSyntax} codeLanguage={codeLanguage} />
                    </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                              <div className="flex items-center gap-2">
                                <span 
                                  className={`select-all ${token.value && typeof token.value === 'string' && token.value.startsWith('--') ? 'cursor-pointer hover:text-blue-600 hover:underline transition-colors' : ''}`}
                                  onClick={() => token.value && typeof token.value === 'string' && token.value.startsWith('--') && onSemanticValueClick?.(token.value)}
                                  title={token.value && typeof token.value === 'string' && token.value.startsWith('--') ? '点击定位到对应的基础颜色' : ''}
                                >
                                  {formatValue(token.value, codeLanguage)}
                                </span>
                                {typeof token.value === 'string' && token.value.startsWith('{') && (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                                    Alias
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            {groupName !== 'typography' && (
                              <TableCell className="text-right pr-6 py-3">
                                {groupName === 'shadow' ? (
                                  <ShadowPreview value={token.value} />
                                ) : (
                                  <ColorSwatch value={token.value} tokenMap={tokenMap} colorHex={token.colorHex} colorAlpha={token.colorAlpha} />
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        ) : items.length > 0 ? (
          // 普通表格显示
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/30">
                <TableHead className={(groupName === 'radius' || groupName === 'spacing') ? "w-[40%] pl-6 text-[11px]" : "w-[30%] pl-6 text-[11px]"}>Variable</TableHead>
                <TableHead className={(groupName === 'radius' || groupName === 'spacing') ? "w-[30%] text-[11px]" : "w-[30%] text-[11px]"}>Code Syntax</TableHead>
                <TableHead className={(groupName === 'radius' || groupName === 'spacing') ? "w-[30%] text-[11px]" : "w-[30%] text-[11px]"}>Value</TableHead>
                {groupName !== 'radius' && groupName !== 'spacing' && (
                  <TableHead className="w-[10%] text-right pr-6 text-[11px]">Preview</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((token) => {
                // Variable name is the token name (JSON key)
                const variableName = token.name;
                // Code syntax from Figma or fallback to variable name
                let codeSyntax = token.codeSyntax || (groupName === 'shadow' ? `--ob-${token.name.replace(/\./g, '-')}` : `--${token.name.replace(/\./g, '-')}`);
                const isHighlighted = highlightedToken === variableName && tokenRowRefs;
                return (
                  <TableRow 
                    key={token.name} 
                    ref={el => { if (tokenRowRefs) tokenRowRefs.current[variableName] = el; }}
                    className={`group transition-colors ${isHighlighted ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''}`}
                  >
                    <TableCell className="pl-6 font-medium font-mono text-[11px] text-purple-600 select-all py-3">
                      {variableName}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-600 select-all py-3">
                      <CodeSyntaxCell codeSyntax={codeSyntax} codeLanguage={codeLanguage} />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 py-3">
                      <div className="flex items-center gap-2">
                        <span className="select-all">{formatValue(token.value, codeLanguage)}</span>
                        {typeof token.value === 'string' && token.value.startsWith('{') && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                            Alias
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {groupName !== 'radius' && groupName !== 'spacing' && (
                      <TableCell className="text-right pr-6 py-3">
                        {groupName === 'shadow' ? (
                          <ShadowPreview value={token.value} />
                        ) : (
                          <ColorSwatch value={token.value} tokenMap={tokenMap} colorHex={token.colorHex} colorAlpha={token.colorAlpha} />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 bg-slate-50/50">
            <FileJson className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-xs">无数据</p>
            <p className="text-slate-400 text-[10px] mt-1">请上传 JSON 文件更新数据</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

// localStorage key
const STORAGE_KEY = 'design-token-manager-data';

// 加载并解析基础token (color-seed.json 和 color-semantic.json)
const loadBaseTokens = (): Record<string, any> => {
  try {
    // 检查color-seed是否是Figma格式
    const isFigmaFormat = colorSeedJson && typeof colorSeedJson === 'object' && 
      Object.values(colorSeedJson).some((item: any) => 
        item?.$type === 'color' && item?.$value && item?.$extensions
      );
    
    // 解析Figma格式的color-seed JSON
    const parsedColorSeed = isFigmaFormat ? parseFigmaVariables(colorSeedJson) : colorSeedJson;
    
    // 将解析后的color-seed数据合并到primitives中
    const mergedPrimitives = {
      ...primitives,
      ...parsedColorSeed
    };
    
    // 构建从变量名到code syntax的映射（用于语义token解析）
    const colorSeedCodeSyntaxMap = buildColorSeedCodeSyntaxMap(colorSeedJson);
    // 构建从变量名到颜色数据(hex和alpha)的映射（用于语义token颜色预览）
    const colorSeedColorMap = buildColorSeedColorMap(colorSeedJson);
    
    // 解析语义token (color-semantic.json)
    let parsedSemantics = semantics;
    try {
      if (colorSemanticJson && typeof colorSemanticJson === 'object') {
        const parsedSemanticTokens = parseSemanticTokens(colorSemanticJson, colorSeedCodeSyntaxMap, colorSeedColorMap);
        // 合并解析后的语义token到semantics中
        parsedSemantics = {
          ...semantics,
          ...parsedSemanticTokens
        };
      }
    } catch (semanticError) {
      console.error('Error parsing semantic tokens:', semanticError);
      // 如果解析失败，使用默认的semantics
    }
    
    return {
      primitives: mergedPrimitives,
      semantics: parsedSemantics,
      components,
      typography,
      radius,
      shadow,
      spacing
    };
  } catch (error) {
    console.error('Error loading base tokens:', error);
    // 如果解析失败，返回默认值
  return {
    primitives,
    semantics,
    components,
    typography,
    radius,
    shadow,
    spacing
  };
  }
};

// 从 localStorage 加载数据
const loadTokensFromStorage = (): Record<string, any> => {
  // 首先加载基础token
  const baseTokens = loadBaseTokens();
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // 如果数据被标记为已刷新，优先使用存储的数据，不合并 baseTokens
      if (parsed._refreshed) {
        // 移除内部标记字段
        const { _refreshed, ...cleanData } = parsed;
        return {
          ...cleanData,
          // 确保其他组有默认值
          components: cleanData.components || baseTokens.components,
          typography: cleanData.typography || baseTokens.typography,
          radius: cleanData.radius || baseTokens.radius,
          shadow: baseTokens.shadow, // shadow 始终使用 baseTokens
          spacing: cleanData.spacing || baseTokens.spacing
        };
      }
      
      // 如果没有刷新标记，使用合并策略（向后兼容）
      const primitives = parsed.primitives && Object.keys(parsed.primitives).length > 0 
        ? parsed.primitives 
        : baseTokens.primitives;
      
      const semantics = parsed.semantics && Object.keys(parsed.semantics).length > 0 
        ? parsed.semantics 
        : baseTokens.semantics;
      
      return {
        ...parsed,
        primitives: primitives,
        semantics: semantics,
        components: parsed.components || baseTokens.components,
        typography: parsed.typography || baseTokens.typography,
        radius: parsed.radius || baseTokens.radius,
        shadow: baseTokens.shadow, // shadow 始终使用 baseTokens，不受 localStorage 影响
        spacing: parsed.spacing || baseTokens.spacing
      };
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  // 如果没有存储的数据，返回基础token
  return baseTokens;
};

// 保存数据到 localStorage
const saveTokensToStorage = (tokens: Record<string, any>) => {
  try {
    // 添加标记，表示数据已被用户刷新过
    const dataToSave = {
      ...tokens,
      _refreshed: true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('数据已成功保存到 localStorage');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    // 如果存储空间不足，尝试清理并重试
    try {
      localStorage.clear();
      const dataToSave = {
        ...tokens,
        _refreshed: true
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('数据已成功保存到 localStorage (清理后)');
    } catch (retryError) {
      console.error('Error saving to localStorage after clear:', retryError);
      toast.error('数据保存失败，可能是存储空间不足');
    }
  }
};

// 更新记录数据（从 JSON 文件导入，按时间倒排）
const updateLogs = [...updateLogsJson].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  // 初始化时包含阴影数据
  const [tokens, setTokens] = useState<Record<string, any>>(() => {
    const baseTokens = loadBaseTokens();
    return {
      shadow: baseTokens.shadow
    };
  });
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null);
  const [typographyLanguage, setTypographyLanguage] = useState<'en' | 'zh' | 'ja'>('en');
  const [codeLanguage, setCodeLanguage] = useState<'css' | 'js'>('css');
  const [isUpdateLogOpen, setIsUpdateLogOpen] = useState(false);

  // 当 typography 语言切换时，自动刷新 typography 数据
  const prevTypographyLanguageRef = useRef<'en' | 'zh' | 'ja'>('en');
  useEffect(() => {
    if (prevTypographyLanguageRef.current !== typographyLanguage) {
      prevTypographyLanguageRef.current = typographyLanguage;
      // 根据当前语言刷新 typography 数据
      let fontJson: any;
      if (typographyLanguage === 'zh') {
        fontJson = fontZhTokensJson;
      } else if (typographyLanguage === 'ja') {
        fontJson = fontJaTokensJson;
      } else {
        fontJson = fontEnTokensJson;
      }
      const parsedTypography = parseTypographyTokens(fontJson);
      updateGroup('typography', parsedTypography);
    }
  }, [typographyLanguage]);

  // Refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tokenRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const isManualScroll = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updateGroup = (groupName: string, data: any) => {
    setTokens(prev => {
      const updated = {
        ...prev,
        [groupName]: data
      };
      // 立即保存到 localStorage 确保数据持久化
      saveTokensToStorage(updated);
      return updated;
    });
  };

  // 全局刷新功能：刷新 primitives 和 semantics
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const [globalRefreshProgress, setGlobalRefreshProgress] = useState(0);

  // 导出功能 - 打包为zip文件下载
  const handleExport = async () => {
    try {
      const filesToExport: Array<{ data: any; filename: string }> = [];
      
      // 收集所有需要导出的文件
      if (tokens.primitives && Object.keys(tokens.primitives).length > 0) {
        const primitivesData = convertPrimitivesToExportFormat(tokens.primitives);
        filesToExport.push({ data: primitivesData, filename: 'color-seed.json' });
      }

      if (tokens.semantics && Object.keys(tokens.semantics).length > 0) {
        const semanticsData = convertSemanticsToExportFormat(tokens.semantics);
        filesToExport.push({ data: semanticsData, filename: 'color-semantic.json' });
      }

      if (tokens.typography && Object.keys(tokens.typography).length > 0) {
        const typographyData = convertTypographyToExportFormat(tokens.typography, typographyLanguage);
        filesToExport.push({ data: typographyData, filename: 'font.json' });
      }

      if (tokens.radius && Object.keys(tokens.radius).length > 0) {
        const radiusData = convertRadiusToExportFormat(tokens.radius);
        filesToExport.push({ data: radiusData, filename: 'radius.json' });
      }

      if (tokens.spacing && Object.keys(tokens.spacing).length > 0) {
        const spacingData = convertSpacingToExportFormat(tokens.spacing);
        filesToExport.push({ data: spacingData, filename: 'space.json' });
      }

      if (tokens.shadow && Object.keys(tokens.shadow).length > 0) {
        const shadowData = convertShadowToExportFormat(tokens.shadow);
        filesToExport.push({ data: shadowData, filename: 'shadow.json' });
      }

      if (filesToExport.length === 0) {
        toast.info('没有可导出的数据');
        return;
      }

      // 动态导入JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 将所有文件添加到zip
      filesToExport.forEach((file) => {
        const jsonString = JSON.stringify(file.data, null, 2);
        zip.file(file.filename, jsonString);
      });

      // 生成zip文件并下载
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'oceanbase-design-tokens.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`成功导出 ${filesToExport.length} 个文件到 oceanbase-design-tokens.zip`);
    } catch (error) {
      console.error('Export error', error);
      toast.error('导出失败，请重试');
    }
  };

  // 转换基础颜色为导出格式
  const convertPrimitivesToExportFormat = (data: any): any => {
    const result: any = {};
    
    for (const key in data) {
      const token = data[key];
      if (token && typeof token === 'object' && 'value' in token) {
        // 基础颜色：扁平结构，key 就是颜色名称
        const tokenData: any = {
          $type: 'color',
          $value: token.value
        };
        
        // 如果有 codeSyntax，根据 codeLanguage 转换
        if (token.codeSyntax) {
          const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
          tokenData.$extensions = {
            'com.figma.codeSyntax': {
              WEB: codeSyntaxValue
            }
          };
        }
        
        result[key] = tokenData;
      }
    }
    
    return result;
  };

  // 转换语义颜色为导出格式
  const convertSemanticsToExportFormat = (data: any): any => {
    const result: any = {};
    
    // 语义颜色按分类组织：bg, border, text, icon
    for (const category in data) {
      if (typeof data[category] === 'object' && data[category] !== null) {
        result[category] = {};
        
        for (const tokenKey in data[category]) {
          const token = data[category][tokenKey];
          if (token && typeof token === 'object' && 'value' in token) {
            // 从 color-{category}-{name} 提取 name
            const name = tokenKey.replace(`color-${category}-`, '');
            const tokenData: any = {
              $type: 'color',
              $value: codeLanguage === 'js' && typeof token.value === 'string' && token.value.startsWith('--') 
                ? convertToJS(token.value) 
                : token.value
            };
            
            // 如果有 codeSyntax，根据 codeLanguage 转换
            if (token.codeSyntax) {
              const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
              tokenData.$extensions = {
                'com.figma.codeSyntax': {
                  WEB: codeSyntaxValue
                }
              };
            }
            
            result[category][name] = tokenData;
          }
        }
      }
    }
    
    return result;
  };

  // 转换圆角为导出格式
  const convertRadiusToExportFormat = (data: any): any => {
    const result: any = {
      radius: {}
    };
    
    for (const key in data) {
      const token = data[key];
      if (token && typeof token === 'object' && 'value' in token) {
        // 从 radius-{key} 提取 key
        const tokenKey = key.replace('radius-', '');
        const tokenData: any = {
          $type: 'number',
          $value: Number(token.value)
        };
        
        // 如果有 codeSyntax，根据 codeLanguage 转换
        if (token.codeSyntax) {
          const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
          tokenData.$extensions = {
            'com.figma.codeSyntax': {
              WEB: codeSyntaxValue
            }
          };
        }
        
        result.radius[tokenKey] = tokenData;
      }
    }
    
    return result;
  };

  // 转换间距为导出格式
  const convertSpacingToExportFormat = (data: any): any => {
    const result: any = {
      space: {}
    };
    
    for (const key in data) {
      const token = data[key];
      if (token && typeof token === 'object' && 'value' in token) {
        // 从 space-{key} 提取 key
        const tokenKey = key.replace('space-', '');
        const tokenData: any = {
          $type: 'number',
          $value: Number(token.value)
        };
        
        // 如果有 codeSyntax，根据 codeLanguage 转换
        if (token.codeSyntax) {
          const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
          tokenData.$extensions = {
            'com.figma.codeSyntax': {
              WEB: codeSyntaxValue
            }
          };
        }
        
        result.space[tokenKey] = tokenData;
      }
    }
    
    return result;
  };

  // 转换阴影为导出格式
  const convertShadowToExportFormat = (data: any): any => {
    const result: any = {};
    
    for (const key in data) {
      const token = data[key];
      if (token && typeof token === 'object' && 'value' in token) {
        // 阴影：扁平结构
        const tokenData: any = {
          $type: 'shadow',
          $value: token.value
        };
        
        // 如果有 codeSyntax，根据 codeLanguage 转换
        if (token.codeSyntax) {
          const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
          tokenData.$extensions = {
            'com.figma.codeSyntax': {
              WEB: codeSyntaxValue
            }
          };
        }
        
        result[key] = tokenData;
      }
    }
    
    return result;
  };

  // 转换 typography 为导出格式（根据语言）
  const convertTypographyToExportFormat = (data: any, language: 'en' | 'zh' | 'ja'): any => {
    const result: any = {
      family: {},
      weight: {},
      size: {},
      'line-height': {}
    };
    
    // 处理 family
    if (data.family) {
      for (const key in data.family) {
        const token = data.family[key];
        if (token && token.value) {
          // 从 font-family-default 提取 default
          const tokenKey = key.replace('font-family-', '');
          const tokenData: any = {
            $type: 'string',
            $value: token.value
          };
          
          // 如果有 codeSyntax，根据 codeLanguage 转换
          if (token.codeSyntax) {
            const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
            tokenData.$extensions = {
              'com.figma.codeSyntax': {
                WEB: codeSyntaxValue
              }
            };
          }
          
          result.family[tokenKey] = tokenData;
        }
      }
    }
    
    // 处理 weight
    if (data.weight) {
      for (const key in data.weight) {
        const token = data.weight[key];
        if (token && token.value) {
          const tokenKey = key.replace('font-weight-', '');
          const tokenData: any = {
            $type: 'string',
            $value: token.value
          };
          
          // 如果有 codeSyntax，根据 codeLanguage 转换
          if (token.codeSyntax) {
            const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
            tokenData.$extensions = {
              'com.figma.codeSyntax': {
                WEB: codeSyntaxValue
              }
            };
          }
          
          result.weight[tokenKey] = tokenData;
        }
      }
    }
    
    // 处理 size
    if (data.size) {
      for (const key in data.size) {
        const token = data.size[key];
        if (token && token.value) {
          const tokenKey = key.replace('font-size-', '');
          const tokenData: any = {
            $type: 'number',
            $value: Number(token.value)
          };
          
          // 如果有 codeSyntax，根据 codeLanguage 转换
          if (token.codeSyntax) {
            const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
            tokenData.$extensions = {
              'com.figma.codeSyntax': {
                WEB: codeSyntaxValue
              }
            };
          }
          
          result.size[tokenKey] = tokenData;
        }
      }
    }
    
    // 处理 line-height
    if (data['line-height']) {
      for (const key in data['line-height']) {
        const token = data['line-height'][key];
        if (token && token.value) {
          const tokenKey = key.replace('font-line-height-', '');
          const tokenData: any = {
            $type: 'number',
            $value: Number(token.value)
          };
          
          // 如果有 codeSyntax，根据 codeLanguage 转换
          if (token.codeSyntax) {
            const codeSyntaxValue = codeLanguage === 'js' ? convertToJS(token.codeSyntax) : token.codeSyntax;
            tokenData.$extensions = {
              'com.figma.codeSyntax': {
                WEB: codeSyntaxValue
              }
            };
          }
          
          result['line-height'][tokenKey] = tokenData;
        }
      }
    }
    
    // 添加语言扩展信息
    result.$extensions = {
      'com.figma.modeName': language === 'zh' ? '中文' : language === 'ja' ? '日本語' : 'English'
    };
    
    return result;
  };

  // 下载 JSON 文件
  const downloadJSON = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGlobalRefresh = async () => {
    setIsGlobalRefreshing(true);
    setGlobalRefreshProgress(0);

    try {
      // 刷新 primitives
      setGlobalRefreshProgress(10);
      let parsedPrimitives: any;
      const isFigmaFormatPrimitives = colorSeedTokensJson && typeof colorSeedTokensJson === 'object' && 
        Object.values(colorSeedTokensJson).some((item: any) => 
          item?.$type === 'color' && item?.$value && item?.$extensions && !item?.$extensions?.['com.figma.aliasData']
        );
      parsedPrimitives = isFigmaFormatPrimitives ? parseFigmaVariables(colorSeedTokensJson) : colorSeedTokensJson;
      
      setGlobalRefreshProgress(50);

      // 刷新 semantics
      setGlobalRefreshProgress(60);
      const colorSeedCodeSyntaxMap = buildColorSeedCodeSyntaxMap(colorSeedJson);
      const colorSeedColorMap = buildColorSeedColorMap(colorSeedJson);
      const parsedSemantics = parseSemanticTokens(colorSemanticTokensJson, colorSeedCodeSyntaxMap, colorSeedColorMap);
      
      setGlobalRefreshProgress(75);
      
      // 刷新 radius
      const parsedRadius = parseRadiusTokens(sizeTokensJson);
      
      setGlobalRefreshProgress(80);
      
      // 刷新 spacing
      const parsedSpacing = parseSpacingTokens(sizeTokensJson);
      
      setGlobalRefreshProgress(85);
      
      // 刷新 typography（根据当前选择的语言）
      let fontJson: any;
      if (typographyLanguage === 'zh') {
        fontJson = fontZhTokensJson;
      } else if (typographyLanguage === 'ja') {
        fontJson = fontJaTokensJson;
      } else {
        fontJson = fontEnTokensJson;
      }
      const parsedTypography = parseTypographyTokens(fontJson);
      
      setGlobalRefreshProgress(90);

      // 获取基础 token 数据（包含 shadow）
      const baseTokens = loadBaseTokens();

      // 统一更新所有数据并保存
      setTokens(prev => {
        const updated = {
          ...prev,
          primitives: parsedPrimitives,
          semantics: parsedSemantics,
          radius: parsedRadius,
          spacing: parsedSpacing,
          typography: parsedTypography,
          shadow: baseTokens.shadow // 确保阴影数据始终存在
        };
        // 立即保存到 localStorage 确保数据持久化
        saveTokensToStorage(updated);
        return updated;
      });

      setGlobalRefreshProgress(100);
      
      setTimeout(() => {
        setIsGlobalRefreshing(false);
        setGlobalRefreshProgress(0);
      }, 200);
    } catch (error) {
      console.error("Global refresh error", error);
      setIsGlobalRefreshing(false);
      setGlobalRefreshProgress(0);
    }
  };

  const clearGroup = (groupName: string) => {
    setTokens(prev => {
      const updated = {
        ...prev,
        [groupName]: {}
      };
      saveTokensToStorage(updated);
      return updated;
    });
  };
  
  // 监听 tokens 变化并保存（作为备用方案）
  useEffect(() => {
    // 只在 tokens 不为空时保存，避免初始空状态覆盖已有数据
    if (Object.keys(tokens).length > 0) {
      saveTokensToStorage(tokens);
    }
  }, [tokens]);

  // 页面加载时自动刷新获取数据
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // 立即执行全局刷新
      handleGlobalRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tokenMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(tokens).forEach(([groupName, groupData]) => {
      const flat = flattenTokens(groupData, '', groupName);
      flat.forEach(item => {
        map[`${groupName}.${item.name}`] = item.value;
        map[item.name] = item.value;
      });
    });
    return map;
  }, [tokens]);

  // Get section-specific token data
  const getSectionData = (sectionId: string) => {
    // 每个导航项直接对应一个group
    const groupName = sectionId;
    const groupData = tokens[groupName];
    
    if (!groupData) return [];
    
    const flat = flattenTokens(groupData, '', groupName);
    const query = searchQuery.toLowerCase();
    const filtered = flat.filter(item => {
      // 搜索 variable (name)
      if (item.name.toLowerCase().includes(query)) return true;
      // 搜索 value
      if (item.value && item.value.toLowerCase().includes(query)) return true;
      // 搜索 code syntax
      if (item.codeSyntax && item.codeSyntax.toLowerCase().includes(query)) return true;
      // 搜索 code syntax 的 JS 格式（如果当前是 JS 模式）
      if (codeLanguage === 'js' && item.codeSyntax) {
        const jsSyntax = convertToJS(item.codeSyntax);
        if (jsSyntax.toLowerCase().includes(query)) return true;
      }
      return false;
    });
    
    return [{
      groupName,
      items: filtered
    }];
  };

  const primitivesData = useMemo(() => getSectionData('primitives'), [tokens, searchQuery, codeLanguage]);
  const semanticsData = useMemo(() => getSectionData('semantics'), [tokens, searchQuery, codeLanguage]);
  const typographyData = useMemo(() => getSectionData('typography'), [tokens, searchQuery, codeLanguage]);
  const radiusData = useMemo(() => getSectionData('radius'), [tokens, searchQuery, codeLanguage]);
  const spacingData = useMemo(() => getSectionData('spacing'), [tokens, searchQuery, codeLanguage]);
  const shadowData = useMemo(() => getSectionData('shadow'), [tokens, searchQuery, codeLanguage]);

  const scrollToSection = (id: string) => {
    isManualScroll.current = true;
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { isManualScroll.current = false; }, 1000);
  };

  // Build reverse map from code syntax to variable name for primitives
  const codeSyntaxToVariableMap = useMemo(() => {
    return buildCodeSyntaxToVariableMap(colorSeedJson);
  }, []);

  // Handle clicking on semantic token value to navigate to base color
  const handleSemanticValueClick = (value: string) => {
    if (!value) return;
    
    // Find the variable name from the code syntax (e.g., --ob-white -> white)
    const variableName = codeSyntaxToVariableMap[value];
    if (!variableName) return;
    
    // Scroll to primitives section
    scrollToSection('primitives');
    
    // Highlight the token row
    setHighlightedToken(variableName);
    
    // Scroll to the specific row after a short delay
    setTimeout(() => {
      const rowElement = tokenRowRefs.current[variableName];
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      setHighlightedToken(null);
    }, 3000);
  };

  // Removed IntersectionObserver since we don't need active state tracking anymore

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      {/* Header - 横向拉通 */}
      <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0 z-20 w-full">
        <h2 className="text-base font-semibold capitalize">OceanBase Design Tokens</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search tokens..." 
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* 代码语言切换器 */}
          <Select value={codeLanguage} onValueChange={(value: 'css' | 'js') => setCodeLanguage(value)}>
            <SelectTrigger className="h-9 w-28 text-xs border-slate-200 bg-white">
              <SelectValue>
                {codeLanguage === 'css' ? 'CSS' : 'JS'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="js">JS</SelectItem>
            </SelectContent>
          </Select>
          {/* 导出按钮 */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            className="h-9 w-9"
            title="导出所有 JSON 文件"
          >
            <Download className="w-4 h-4" />
          </Button>
          {/* 更新记录按钮 */}
          <Drawer open={isUpdateLogOpen} onOpenChange={setIsUpdateLogOpen} direction="right">
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="更新记录"
              >
                <History className="w-4 h-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-full max-w-md">
              <div className="flex flex-col h-full">
                <DrawerHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <DrawerTitle className="text-sm">更新记录</DrawerTitle>
                    <DrawerClose asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="关闭"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {updateLogs.map((log, index) => (
                      <div key={index} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-900 mb-1">
                              {log.date}
                            </div>
                            <div className="text-xs text-slate-600">
                              {Array.isArray(log.content) ? (
                                <ul className="list-none space-y-1">
                                  {log.content.map((line: string, lineIndex: number) => (
                                    <li key={lineIndex}>{line}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="whitespace-pre-line">{log.content}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
          {/* 全局刷新按钮 */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleGlobalRefresh}
            disabled={isGlobalRefreshing}
            className="h-9 w-9"
            title={isGlobalRefreshing ? "刷新中..." : "全局刷新"}
          >
            {isGlobalRefreshing ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>
      
      {/* 全局刷新进度条 */}
      {isGlobalRefreshing && (
        <div className="h-1 bg-slate-100 relative">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${globalRefreshProgress}%` }}
          />
        </div>
      )}

      {/* Content Area - Sidebar + Main */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[200px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 z-10 h-full">
          <nav className="w-[200px] flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* Scrollable Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-50/50 scroll-smooth">
          <div className="p-6 space-y-4 pb-32">
            {/* 基础颜色 */}
                {(() => {
              const data = primitivesData[0];
              if (!data || data.items.length === 0) return null;
                  return (
                <div id="primitives" ref={el => { sectionRefs.current['primitives'] = el; }} className="scroll-mt-4">
                    <TokenGroup 
                      key="primitives"
                      groupName="primitives"
                    items={data.items}
                      tokenMap={tokenMap}
                      onUpdate={(data) => updateGroup('primitives', data)}
                    defaultOpen={true}
                    highlightedToken={highlightedToken}
                    tokenRowRefs={tokenRowRefs}
                    displayTitle={getGroupLabel('primitives')}
                    codeLanguage={codeLanguage}
                    />
                </div>
                  );
                })()}
                
            {/* 语义颜色 */}
                {(() => {
              if (!tokens.semantics) return null;
              
              // 按分类1分组，准备categoryItems
              const categories = Object.keys(tokens.semantics).filter(key => 
                typeof tokens.semantics[key] === 'object' && tokens.semantics[key] !== null
              );
              
              const categoryItems: Record<string, { name: string; value: string; path: string[]; codeSyntax?: string; colorHex?: string; colorAlpha?: number }[]> = {};
              
              categories.forEach((category) => {
                const categoryData = tokens.semantics[category];
                const flat = flattenTokens(categoryData, '', 'semantics');
                const query = searchQuery.toLowerCase();
                const filtered = searchQuery 
                  ? flat.filter(item => {
                      // 搜索 variable (name)
                      if (item.name.toLowerCase().includes(query)) return true;
                      // 搜索 value
                      if (item.value && item.value.toLowerCase().includes(query)) return true;
                      // 搜索 code syntax
                      if (item.codeSyntax && item.codeSyntax.toLowerCase().includes(query)) return true;
                      // 搜索 code syntax 的 JS 格式（如果当前是 JS 模式）
                      if (codeLanguage === 'js' && item.codeSyntax) {
                        const jsSyntax = convertToJS(item.codeSyntax);
                        if (jsSyntax.toLowerCase().includes(query)) return true;
                      }
                      return false;
                    })
                  : flat;
                categoryItems[category] = filtered;
              });
              
              // 计算总items数量用于显示
              const totalItems = Object.values(categoryItems).reduce((sum, items) => sum + items.length, 0);
              
              if (totalItems === 0) return null;
              
                  return (
                <div id="semantics" ref={el => { sectionRefs.current['semantics'] = el; }} className="scroll-mt-4">
                    <TokenGroup 
                      groupName="semantics"
                    items={[]}
                      tokenMap={tokenMap}
                      onUpdate={(data) => updateGroup('semantics', data)}
                    defaultOpen={true}
                    categoryItems={categoryItems}
                    onSemanticValueClick={handleSemanticValueClick}
                    displayTitle={getGroupLabel('semantics')}
                    codeLanguage={codeLanguage}
                    />
                </div>
                  );
                })()}
                
            {/* 文本 */}
                {(() => {
              if (!tokens.typography) return null;
              
              // 按分类分组，准备categoryItems
              const categories = ['family', 'weight', 'size', 'line-height'];
              
              const categoryItems: Record<string, { name: string; value: string; path: string[]; codeSyntax?: string }[]> = {};
              
              categories.forEach((category) => {
                const categoryData = tokens.typography[category];
                if (!categoryData) return;
                
                const flat = flattenTokens(categoryData, '', 'typography');
                const query = searchQuery.toLowerCase();
                const filtered = searchQuery 
                  ? flat.filter(item => {
                      // 搜索 variable (name)
                      if (item.name.toLowerCase().includes(query)) return true;
                      // 搜索 value
                      if (item.value && item.value.toLowerCase().includes(query)) return true;
                      // 搜索 code syntax
                      if (item.codeSyntax && item.codeSyntax.toLowerCase().includes(query)) return true;
                      // 搜索 code syntax 的 JS 格式（如果当前是 JS 模式）
                      if (codeLanguage === 'js' && item.codeSyntax) {
                        const jsSyntax = convertToJS(item.codeSyntax);
                        if (jsSyntax.toLowerCase().includes(query)) return true;
                      }
                      return false;
                    })
                  : flat;
                categoryItems[category] = filtered;
              });
              
              // 计算总items数量用于显示
              const totalItems = Object.values(categoryItems).reduce((sum, items) => sum + items.length, 0);
              
              if (totalItems === 0) return null;
              
                  return (
                <div id="typography" ref={el => { sectionRefs.current['typography'] = el; }} className="scroll-mt-4">
                    <TokenGroup 
                    key="typography"
                    groupName="typography"
                    items={[]}
                      tokenMap={tokenMap}
                    onUpdate={(data) => updateGroup('typography', data)}
                    defaultOpen={true}
                    displayTitle={getGroupLabel('typography')}
                    categoryItems={categoryItems}
                    typographyLanguage={typographyLanguage}
                    onTypographyLanguageChange={setTypographyLanguage}
                    codeLanguage={codeLanguage}
                    tokens={tokens}
                    />
                </div>
                  );
                })()}
                
            {/* 圆角 */}
            {(() => {
              const data = radiusData[0];
              if (!data || data.items.length === 0) return null;
              return (
                <div id="radius" ref={el => { sectionRefs.current['radius'] = el; }} className="scroll-mt-4">
                    <TokenGroup 
                    key="radius"
                    groupName="radius"
                    items={data.items}
                      tokenMap={tokenMap}
                    onUpdate={(data) => updateGroup('radius', data)}
                    defaultOpen={true}
                    displayTitle={getGroupLabel('radius')}
                    hideActions={false}
                    codeLanguage={codeLanguage}
                  />
                  </div>
              );
            })()}
            
            {/* 间距 */}
            {(() => {
              const data = spacingData[0];
              if (!data || data.items.length === 0) return null;
              return (
                <div id="spacing" ref={el => { sectionRefs.current['spacing'] = el; }} className="scroll-mt-4">
                    <TokenGroup 
                    key="spacing"
                    groupName="spacing"
                    items={data.items}
                      tokenMap={tokenMap}
                    onUpdate={(data) => updateGroup('spacing', data)}
                    defaultOpen={true}
                    displayTitle={getGroupLabel('spacing')}
                    hideActions={false}
                    codeLanguage={codeLanguage}
                    />
                  </div>
              );
            })()}
            
            {/* 阴影 */}
            {(() => {
              const data = shadowData[0];
              if (!data || data.items.length === 0) return null;
              return (
                <div id="shadow" ref={el => { sectionRefs.current['shadow'] = el; }} className="scroll-mt-4">
                    <TokenGroup 
                    key="shadow"
                    groupName="shadow"
                    items={data.items}
                    tokenMap={tokenMap}
                    onUpdate={(data) => updateGroup('shadow', data)}
                    defaultOpen={true}
                    hideActions={true}
                    displayTitle={getGroupLabel('shadow')}
                    codeLanguage={codeLanguage}
                  />
                  </div>
              );
            })()}
          </div>
        </div>
        </main>
      </div>
      <Sonner position="top-right" />
    </div>
  );
}
