import json
import re
import sys

re_subheading = re.compile(r'\n#{1,3} ')
re_index_ignore = re.compile(r'[^A-Za-z0-9 -]')

def make_index(name):
    return re_index_ignore.sub('', name).replace(' ', '-').lower()

srd_index = {
    'name': 'System Reference Document 5.1',
    'index': 'srd',
    'url': '/api/rules/srd',
}

section_lookup = dict()

output = {
    'srd': srd_index.copy(),
}
output['srd']['children'] = list()

# Massage rules to suit the new schema.
with open('src/5e-SRD-Rules.json') as fh:
    for rule_in in json.load(fh):
        rule_out_ref = {
            'name': rule_in['name'],
            'index': rule_in['index'],
            'url': rule_in['url'],
        }
        rule_out = rule_out_ref.copy()

        desc = rule_in['desc']
        if desc.startswith('#'):
            desc = '\n'.join(desc.split('\n')[1:]).strip()
        if desc:
            rule_out['desc'] = desc

        rule_out['parent'] = srd_index
        if rule_in['subsections']:
            rule_out['children'] = [
                {
                    'name': subsection['name'],
                    'index': subsection['index'],
                    'url': '/api/rules/' + subsection['index'],
                } for subsection in rule_in['subsections']
            ]
            section_lookup.update({
                subsection['index']: rule_out_ref
                    for subsection in rule_in['subsections']
            })

        output[rule_out['index']] = rule_out
        output['srd']['children'].append(rule_out_ref)

# Import individual sections in the new schema.
with open('src/5e-SRD-Rule-Sections.json') as fh:
    for rule_in in json.load(fh):
        rule_out_ref = {
            'name': rule_in['name'],
            'index': rule_in['index'],
            'url': '/api/rules/' + rule_in['index'],
        }
        rule_out = rule_out_ref.copy()

        desc = rule_in['desc']
        if desc.startswith('#'):
            desc = '\n'.join(desc.split('\n')[1:]).strip()
        if desc:
            rule_out['desc'] = desc

        rule_out['parent'] = section_lookup[rule_out['index']]

        output[rule_out['index']] = rule_out

# Split sections containing subheadings.
has_subheading = True
while has_subheading:
    has_subheading = False
    for rule_index in list(output.keys()):
        rule = output[rule_index]
        if 'desc' in rule and re_subheading.search(rule['desc']):
            has_subheading = True
            rule_ref = {
                'name': rule['name'],
                'index': rule['index'],
                'url': rule['url'],
            }

            min_depth = None
            for match in re_subheading.finditer(rule['desc']):
                if min_depth == None:
                    min_depth = match.end() - match.start() - 2
                else:
                    min_depth = min(min_depth, match.end() - match.start() - 2)

            desc_parts = rule['desc'].split('\n' + ('#' * min_depth) + ' ')
            rule['desc'] = desc_parts[0].strip()
            for desc_part in desc_parts[1:]:
                (child_name, child_desc) = desc_part.split('\n', maxsplit = 1)
                child_index = make_index(child_name)

                if child_index in output:
                    print('Duplicate index "' + child_index + '" for "' +
                            child_name + '"')
                    sys.exit()

                child_ref = {
                    'name': child_name,
                    'index': child_index,
                    'url': '/api/rules/' + child_index,
                }

                if 'children' in rule:
                    rule['children'].append(child_ref)
                else:
                    rule['children'] = [child_ref]

                child = child_ref.copy()
                child['desc'] = child_desc.strip()
                child['parent'] = rule_ref

                output[child_index] = child

json.dump(
    list(output.values()),
    sys.stdout,
    indent = 2,
)
