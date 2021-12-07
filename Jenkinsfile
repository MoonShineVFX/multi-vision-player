pipeline {
    environment {
        STREAM_HOST = '/stream'
        WEB_FOLDER = 'multi-vision'
    }
    agent {
        docker {
            image 'node:14-alpine'
        }
    }
    stages {
        stage('Install') {
            steps {
                sh 'yarn install'
            }
        }
        stage('Build') {
            steps {
                sh 'yarn run build'
            }
        }
        stage('Deploy') {
            steps {
                sh "rm -rf /var/web/${WEB_FOLDER}"
                sh "mv ./build /var/web/${WEB_FOLDER}"
                sh "chmod -R 755 /var/web/${WEB_FOLDER}"
            }
        }
    }
}
