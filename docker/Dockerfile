# Stage 1: Build dependencies and download SDKs/tools
ARG VERSION=latest

FROM ghcr.io/project-chip/chip-build:${VERSION} AS build
LABEL org.opencontainers.image.source https://github.com/project-chip/connectedhomeip
# Allow overriding the matter_extension repository and ref at build time for reproducibility
ARG MATTER_EXTENSION_REPO=https://github.com/SiliconLabsSoftware/matter_extension.git
ARG MATTER_EXTENSION_REF=main

# Clone matter_extension (shallow) and initialize submodules recursively, then create deterministic symlink
RUN git clone --depth 1 --branch ${MATTER_EXTENSION_REF} ${MATTER_EXTENSION_REPO} /opt/matter_extension \
    && git -C /opt/matter_extension submodule update --init \
    && mkdir -p /opt/matter_extension/third_party/simplicity_sdk/extension \
    && ln -sfn /opt/matter_extension /opt/matter_extension/third_party/simplicity_sdk/extension/matter_extension \
    && ln -sfn /opt/matter_extension/third_party/wifi_sdk /opt/matter_extension/third_party/simplicity_sdk/extension/wifi_sdk \
    && : # last line

# Download and extract SLC CLI
RUN wget https://www.silabs.com/documents/login/software/slc_cli_linux.zip \
    && unzip ./slc_cli_linux.zip -d /tmp \
    && rm ./slc_cli_linux.zip \
    && : # last line

# Download and extract Simplicity Commander
RUN wget https://www.silabs.com/documents/public/software/SimplicityCommander-Linux.zip \
    && unzip ./SimplicityCommander-Linux.zip -d /tmp/simplicity-commander \
    && rm ./SimplicityCommander-Linux.zip \
    && FILE=$(find /tmp/simplicity-commander -name "*Commander_linux_x86_64*") \
    && if [ -n "$FILE" ]; then \
    tar -xjvf "$FILE" -C /tmp/simplicity-commander; \
    else \
    echo "File not found"; \
    fi \
    && : # last line

# Download and extract ARM GCC toolchain v12.2.rel1
RUN wget https://developer.arm.com/-/media/Files/downloads/gnu/12.2.rel1/binrel/arm-gnu-toolchain-12.2.rel1-x86_64-arm-none-eabi.tar.xz -O /tmp/arm-gnu-toolchain.tar.xz \
    && tar -xJvf /tmp/arm-gnu-toolchain.tar.xz -C /tmp \
    && rm -rf /tmp/arm-gnu-toolchain.tar.xz \
    && : # last line

# Download and extract Amazon Corretto Java 21
RUN wget https://corretto.aws/downloads/resources/21.0.7.6.1/amazon-corretto-21.0.7.6.1-linux-x64.tar.gz -O /tmp/java.tar.gz \
    && tar -xzf /tmp/java.tar.gz -C /tmp \
    && rm /tmp/java.tar.gz \
    && ls /tmp \
    && : # last line

# Stage 2: Final image for SDK compilation
FROM ghcr.io/project-chip/chip-build:${VERSION}

# Add Python requirements
ADD docker/requirements.txt /tmp/requirements.txt

ENV MATTER_ROOT=/opt/silabs/matter_extension
# Set environment variables for SDKs and tools
ENV GSDK_ROOT=$MATTER_ROOT/third_party/simplicity_sdk/
ENV SISDK_ROOT=$MATTER_ROOT/third_party/simplicity_sdk/
ENV WISECONNECT_SDK_ROOT=$MATTER_ROOT/third_party/wiseconnect-wifi-bt-sdk/
ENV WISECONNECT3_DIR=${SISDK_ROOT}/extension/wiseconnect
ENV ARM_GCC_DIR=/opt/arm-gcc
ENV JAVA21_HOME=/opt/silabs/amazon-corretto-21.0.7.6.1-linux-x64
ENV PATH="${PATH}:/opt/silabs/slc_cli/"
ENV PATH="${PATH}:${ARM_GCC_DIR}/bin"
ENV PATH="${PATH}:${JAVA21_HOME}/bin"
ENV POST_BUILD_EXE=/opt/silabs/simplicity-commander/commander/commander

COPY --from=build /tmp/slc_cli /opt/silabs/slc_cli
COPY --from=build /tmp/simplicity-commander /opt/silabs/simplicity-commander
COPY --from=build /tmp/arm-gnu-toolchain-* ${ARM_GCC_DIR}
COPY --from=build /tmp/amazon-corretto-21.0.7.6.1-linux-x64 ${JAVA21_HOME}
COPY --from=build /opt/matter_extension ${MATTER_ROOT}