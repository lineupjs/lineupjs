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
   } catch (e) {
     // if any exception occurs, mark the build as failed
     currentBuild.result = 'FAILURE'
     throw e
   }
   currentBuild.result = "SUCCESS"
 }

 stage('Post Build') {
   archiveArtifacts artifacts: 'build/*.(js|css|map)'
 }

 stage('Cleanup') {
   sh 'npm prune'
   sh 'rm node_modules -rf'
 }
}
