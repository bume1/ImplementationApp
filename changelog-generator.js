/**
 * Changelog Generator
 * Automatically generates changelog from git commits
 *
 * Commit message conventions:
 * - feat: or feature: for new features
 * - fix: or bugfix: for bug fixes
 * - refactor: for code refactoring
 * - ui: or style: for UI/styling changes
 * - docs: for documentation changes
 * - perf: for performance improvements
 *
 * Version tagging:
 * - Commits with "v1.2.3" pattern in message are treated as version releases
 * - Or use git tags for versions
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Category definitions
const CATEGORIES = {
  feat: { label: 'New Features', color: 'primary', priority: 1 },
  feature: { label: 'New Features', color: 'primary', priority: 1 },
  fix: { label: 'Bug Fixes', color: 'success', priority: 2 },
  bugfix: { label: 'Bug Fixes', color: 'success', priority: 2 },
  ui: { label: 'UI Improvements', color: 'purple', priority: 3 },
  style: { label: 'UI Improvements', color: 'purple', priority: 3 },
  refactor: { label: 'Improvements', color: 'blue', priority: 4 },
  perf: { label: 'Performance', color: 'orange', priority: 5 },
  docs: { label: 'Documentation', color: 'gray', priority: 6 }
};

// Parse a single commit message
function parseCommitMessage(message) {
  // Check for conventional commit format: type(scope): description
  const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);

  if (conventionalMatch) {
    const [, type, scope, description] = conventionalMatch;
    const category = CATEGORIES[type.toLowerCase()];

    if (category) {
      return {
        type: type.toLowerCase(),
        scope: scope || null,
        description: description.trim(),
        category: category.label,
        color: category.color,
        priority: category.priority
      };
    }
  }

  // Fallback: Check for keywords anywhere in message
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('add ') || lowerMessage.includes('new ') || lowerMessage.includes('implement')) {
    return {
      type: 'feat',
      scope: null,
      description: message.trim(),
      category: 'New Features',
      color: 'primary',
      priority: 1
    };
  }

  if (lowerMessage.includes('fix ') || lowerMessage.includes('fixed ') || lowerMessage.includes('resolve')) {
    return {
      type: 'fix',
      scope: null,
      description: message.trim(),
      category: 'Bug Fixes',
      color: 'success',
      priority: 2
    };
  }

  if (lowerMessage.includes('update ') || lowerMessage.includes('improve') || lowerMessage.includes('enhance')) {
    return {
      type: 'refactor',
      scope: null,
      description: message.trim(),
      category: 'Improvements',
      color: 'blue',
      priority: 4
    };
  }

  // Default: treat as improvement
  return {
    type: 'misc',
    scope: null,
    description: message.trim(),
    category: 'Changes',
    color: 'gray',
    priority: 7
  };
}

// Get commits since last tag or last N commits
function getRecentCommits(since = null, maxCount = 50) {
  try {
    let command = 'git log --pretty=format:"%H|%s|%ai" ';

    if (since) {
      command += `${since}..HEAD `;
    }

    command += `-n ${maxCount}`;

    const output = execSync(command, { encoding: 'utf-8' });

    if (!output.trim()) return [];

    return output.trim().split('\n').map(line => {
      const [hash, message, date] = line.split('|');
      return { hash, message, date: new Date(date) };
    });
  } catch (error) {
    console.error('Error getting commits:', error.message);
    return [];
  }
}

// Get all git tags (versions)
function getVersionTags() {
  try {
    const output = execSync('git tag -l "v*" --sort=-v:refname', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

// Get the latest version tag
function getLatestVersionTag() {
  const tags = getVersionTags();
  return tags.length > 0 ? tags[0] : null;
}

// Group commits by category
function groupCommitsByCategory(commits) {
  const grouped = {};

  commits.forEach(commit => {
    const parsed = parseCommitMessage(commit.message);

    // Skip merge commits and generic commits
    if (commit.message.toLowerCase().startsWith('merge ')) return;
    if (commit.message.toLowerCase() === 'initial commit') return;

    if (!grouped[parsed.category]) {
      grouped[parsed.category] = {
        label: parsed.category,
        color: parsed.color,
        priority: parsed.priority,
        items: []
      };
    }

    grouped[parsed.category].items.push({
      message: parsed.description,
      hash: commit.hash.substring(0, 7),
      date: commit.date
    });
  });

  // Sort by priority
  return Object.values(grouped).sort((a, b) => a.priority - b.priority);
}

// Generate markdown changelog
function generateMarkdownChangelog(version, date, sections) {
  let md = `\n### ${version} - ${date}\n\n`;

  sections.forEach(section => {
    md += `#### ${section.label}\n`;
    section.items.forEach(item => {
      md += `- ${item.message}\n`;
    });
    md += '\n';
  });

  return md;
}

// Update changelog.md file
async function updateChangelogMd(version, date, sections) {
  const changelogPath = path.join(__dirname, 'public', 'changelog.md');

  try {
    let existingContent = await fs.readFile(changelogPath, 'utf-8');

    // Find the position after the header (after "---" separator)
    const headerEndIndex = existingContent.indexOf('---\n', 50);

    if (headerEndIndex !== -1) {
      const header = existingContent.substring(0, headerEndIndex + 4);
      const existingEntries = existingContent.substring(headerEndIndex + 4);

      // Generate new entry
      const newEntry = generateMarkdownChangelog(version, date, sections);

      // Combine: header + new entry + existing entries
      const updatedContent = header + newEntry + existingEntries;

      await fs.writeFile(changelogPath, updatedContent, 'utf-8');
      console.log(`✅ Updated changelog.md with version ${version}`);
      return true;
    }
  } catch (error) {
    console.error('Error updating changelog.md:', error.message);
  }

  return false;
}

// Generate changelog entry for database storage
function generateChangelogEntry(version, sections) {
  return {
    id: Date.now().toString(),
    version,
    date: new Date().toISOString().split('T')[0],
    sections: sections.map(section => ({
      title: section.label,
      color: section.color,
      items: section.items.map(item => item.message)
    })),
    isCurrent: true,
    createdAt: new Date().toISOString()
  };
}

// Main function to generate changelog from recent commits
async function generateChangelogFromCommits(version = null, sinceTag = null) {
  console.log('📋 Generating changelog from git commits...\n');

  // Determine version
  if (!version) {
    const latestTag = getLatestVersionTag();
    const tagVersion = latestTag ? latestTag.replace('v', '') : '2.5.0';
    const parts = tagVersion.split('.');
    parts[2] = (parseInt(parts[2] || 0) + 1).toString();
    version = `Version ${parts.join('.')}`;
  }

  // Get commits
  const commits = getRecentCommits(sinceTag);

  if (commits.length === 0) {
    console.log('No commits found');
    return null;
  }

  console.log(`Found ${commits.length} commits\n`);

  // Group by category
  const sections = groupCommitsByCategory(commits);

  if (sections.length === 0) {
    console.log('No categorizable changes found');
    return null;
  }

  // Display grouped changes
  console.log('Grouped changes:');
  sections.forEach(section => {
    console.log(`\n${section.label}:`);
    section.items.forEach(item => {
      console.log(`  - ${item.message}`);
    });
  });

  // Generate date string
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Update markdown file
  await updateChangelogMd(version, dateStr, sections);

  // Return entry for database
  return generateChangelogEntry(version, sections);
}

// Export for use in server
module.exports = {
  generateChangelogFromCommits,
  parseCommitMessage,
  groupCommitsByCategory,
  getRecentCommits,
  generateChangelogEntry
};

// CLI usage
if (require.main === module) {
  const version = process.argv[2] || null;
  const sinceTag = process.argv[3] || null;

  generateChangelogFromCommits(version, sinceTag)
    .then(entry => {
      if (entry) {
        console.log('\n✅ Changelog entry generated:');
        console.log(JSON.stringify(entry, null, 2));
      }
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
