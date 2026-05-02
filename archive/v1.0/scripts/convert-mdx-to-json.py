#!/usr/bin/env python3
"""
MDX 词典转 JSON 工具
将 MDict 格式的 .mdx/.mdd 词典文件转换为阅读器可用的 JSON 格式

用法:
    python convert-mdx-to-json.py input.mdx [output.json] [词典名称]

依赖:
    pip install readmdict

输出格式:
    [
        {
            "t": "词条",
            "d": "释义内容",
            "p": "",
            "s": "",
            "c": ""
        },
        ...
    ]
"""

import sys
import json
import os
import re

def convert_mdx_to_json(mdx_path, output_path=None, dict_name=None):
    """将 MDX 文件转换为 JSON 格式"""
    
    # 检查文件是否存在
    if not os.path.exists(mdx_path):
        print(f"错误: 文件不存在 - {mdx_path}")
        sys.exit(1)
    
    # 尝试导入 readmdict
    try:
        from readmdict import MDX, MDD
    except ImportError:
        print("错误: 需要安装 readmdict 库")
        print("请运行: pip install readmdict")
        sys.exit(1)
    
    # 默认输出路径
    if output_path is None:
        base = os.path.splitext(mdx_path)[0]
        output_path = f"{base}.json"
    
    # 默认词典名称
    if dict_name is None:
        dict_name = os.path.basename(mdx_path)
    
    print(f"正在转换: {mdx_path}")
    print(f"输出文件: {output_path}")
    print(f"词典名称: {dict_name}")
    
    # 读取 MDX 文件
    mdx = MDX(mdx_path)
    keys = list(mdx.keys())
    print(f"词条数量: {len(keys)}")
    
    # 转换为 JSON 格式
    entries = []
    for i, (key, value) in enumerate(mdx.items()):
        # 解码词条和释义
        term = key.decode('utf-8', errors='ignore').strip()
        definition = value.decode('utf-8', errors='ignore').strip()
        
        # 清理 HTML 标签（可选，保留纯文本）
        # definition = re.sub(r'<[^>]+>', '', definition)
        
        entries.append({
            "t": term,
            "d": definition,
            "p": "",
            "s": "",
            "c": ""
        })
        
        if (i + 1) % 5000 == 0:
            print(f"  已处理 {i + 1}/{len(keys)} 条...")
    
    # 写入 JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    
    print(f"转换完成! 共 {len(entries)} 条词条")
    print(f"输出文件: {output_path}")
    
    return output_path


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    mdx_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    dict_name = sys.argv[3] if len(sys.argv) > 3 else None
    
    convert_mdx_to_json(mdx_path, output_path, dict_name)


if __name__ == '__main__':
    main()
