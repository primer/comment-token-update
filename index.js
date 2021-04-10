const core = require('@actions/core')
const github = require('@actions/github')
const exec = require('@actions/exec')
const fs = require('fs')

;(async () => {
    try {
    let githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      core.setFailed("Please add the GITHUB_TOKEN to the changesets action");
      return;
    }

    const octokit = github.getOctokit(githubToken)
    
    function getPRId() {
      const ev = JSON.parse(
        fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')
      )
      console.log(ev)
      return ev.pull_request.number
    }

    const commentToken = core.getInput('comment-token')
    const re = new RegExp(`<!-- ${commentToken} -->[\\w\\W]*<!-- \/${commentToken} -->`);
    const script = core.getInput('script')
    let myOutput = '';
    await fs.writeFileSync('sh-script.sh', script)
    const options = {};
    options.listeners = {
      stdout: (data) => {
        myOutput += data.toString();
      }
    };
    await exec.exec('sh sh-script.sh', [], options)
    const { data: issues } = await octokit.issues.listComments({
      issue_number: github.context.issue.number || getPRId(),
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })
    const primerComments = issues.filter(c => c.user.login == 'primer-css')
    if (primerComments.length) {
      const comment = primerComments[0]
      let newBody = comment.body.replace(re, `<!-- ${commentToken} -->\n${myOutput}\n<!-- /${commentToken} -->`)
      await octokit.issues.updateComment({
        comment_id: comment.id,
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        body: newBody
      })
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})()
