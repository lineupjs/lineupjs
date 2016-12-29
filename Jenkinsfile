node {
 stage('Checkout') {
   checkout scm
 }

 stage('Before Install') {
   def nodeHome = tool 'node-v7'
   env.PATH="${env.PATH}:${nodeHome}/bin"
 }

 stage('Install') {
   sh 'node -v'
   sh 'npm --version'
   sh 'npm install'
 }

 stage('Build') {
   try {
     wrap([$class: 'Xvfb']) {
       sh 'npm run dist'
     }
     currentBuild.result = "SUCCESS"
   } catch (e) {
     // if any exception occurs, mark the build as failed
     currentBuild.result = 'FAILURE'
     throw e
   } finally {
     // always clean up
     sh 'npm prune'
     sh 'rm node_modules -rf'
   }
 }

 stage('Post Build') {
   archiveArtifacts artifacts: 'build/*'
 }
}
