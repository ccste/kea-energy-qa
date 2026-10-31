pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        timeout(time: 90, unit: 'MINUTES')
    }

    parameters {
        choice(
            name: 'SUITE',
            choices: ['smoke', 'regression', 'sparky-live', 'full'],
            description: 'Smoke: core journeys. Regression: excludes live AI. Sparky-live: live answers only. Full: includes live AI.'
        )
    }

    environment {
        CI = 'true'
        WORKERS = '2'
    }

    stages {
        stage('Checkout') {
            steps {
                // Use a dedicated Jenkins workspace, never the developer checkout.
                deleteDir()
                checkout scm
                script {
                    if (fileExists('playwright.config.ts')) {
                        env.SUITE_DIRECTORY = '.'
                    } else if (fileExists('qa/e2e/playwright.config.ts')) {
                        env.SUITE_DIRECTORY = 'qa/e2e'
                    } else {
                        error('The checkout does not contain the Kea Energy E2E project.')
                    }
                    currentBuild.description = params.SUITE
                }
            }
        }

        stage('Install dependencies') {
            steps {
                dir(env.SUITE_DIRECTORY) {
                    sh '''
                        node --version
                        npm --version
                        java -version
                        npm ci
                        npx playwright install chromium
                    '''
                }
            }
        }

        stage('Typecheck') {
            steps {
                dir(env.SUITE_DIRECTORY) {
                    sh 'npm run typecheck'
                }
            }
        }

        stage('Run tests') {
            steps {
                dir(env.SUITE_DIRECTORY) {
                    script {
                        def commands = [
                            'smoke': 'npm test -- --grep @smoke',
                            'regression': 'npm test',
                            'sparky-live': 'npm run test:ai',
                            'full': 'npm run test:all'
                        ]
                        def command = commands[params.SUITE]
                        if (!command) {
                            error('Select one of the four supported test suites.')
                        }
                        env.TEST_EXECUTION_STARTED = 'true'
                        // The runner preserves phase order and fails for unsuccessful tests.
                        sh command
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                if (env.TEST_EXECUTION_STARTED == 'true') {
                    dir(env.SUITE_DIRECTORY) {
                        // Attempt each publisher even if another fails; keep failures visible.
                        catchError(buildResult: 'FAILURE', stageResult: 'FAILURE', catchInterruptions: false) {
                            junit testResults: 'reports/latest/junit.xml', allowEmptyResults: false
                        }
                        catchError(buildResult: 'FAILURE', stageResult: 'FAILURE', catchInterruptions: false) {
                            publishHTML(target: [
                                reportName: 'Playwright HTML',
                                reportDir: 'reports/latest/html',
                                reportFiles: 'index.html',
                                keepAll: true,
                                alwaysLinkToLastBuild: true,
                                allowMissing: false
                            ])
                        }
                        catchError(buildResult: 'FAILURE', stageResult: 'FAILURE', catchInterruptions: false) {
                            if (!fileExists('reports/latest/allure-results')) {
                                error('This execution did not produce Allure results.')
                            }
                            sh 'npm run report:allure'
                            publishHTML(target: [
                                reportName: 'Allure Report',
                                reportDir: 'reports/latest/allure-report',
                                reportFiles: 'index.html',
                                keepAll: true,
                                alwaysLinkToLastBuild: true,
                                allowMissing: false
                            ])
                        }
                        catchError(buildResult: 'FAILURE', stageResult: 'FAILURE', catchInterruptions: false) {
                            archiveArtifacts(
                                artifacts: 'reports/latest/junit.xml,reports/latest/run-summary.json',
                                allowEmptyArchive: false
                            )
                        }
                    }
                }
            }
        }
        cleanup {
            script {
                // Also remove saved sessions after an interrupted run.
                if (env.SUITE_DIRECTORY) {
                    dir("${env.SUITE_DIRECTORY}/.runtime") {
                        deleteDir()
                    }
                }
            }
        }
    }
}
