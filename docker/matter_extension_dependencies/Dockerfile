# Set build argument for base image version
ARG VERSION=latest
ARG SISDK_Tag
ARG WiFI_SDK_Tag

# Stage 1: Build dependencies and download SDKs/tools
FROM ghcr.io/project-chip/chip-build:${VERSION} AS build
LABEL org.opencontainers.image.source https://github.com/project-chip/connectedhomeip

# Accept build arguments in this stage
ARG SISDK_Tag
ARG WiFI_SDK_Tag

# Install required packages for cloning and extracting SDKs
RUN set -x \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -fy --no-install-recommends \
    git \
    git-lfs \
    zip \
    tar \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/ \
    && : # last line

# Set UTF-8 locale to ensure unzip handles non-ASCII filenames correctly
# util/third_party/ot-br-posix/third_party/cpp-httplib/repo/test/www/#U65e5#U672c#U8a9eDir/#U65e5#U672c#U8a9eFile.txt
ENV LANG=C.UTF-8

# Clone the Simplicity SDK prerelease branch and remove unused protocols
RUN set -eu \
    && git lfs install \
    && git clone --depth=1 --single-branch --branch=sisdk-2026.12 \
        https://github.com/SiliconLabsSoftware/sisdk-prerelease.git \
        /tmp/simplicity_sdk \
    && cd /tmp/simplicity_sdk \
    && git lfs pull \
    && rm -rf .git \
    && rm -rf protocol/flex protocol/z-wave protocol/wisun \
    && find . -path "*/protocol/openthread" -type d -exec find {} -name "*efr32mg21*" -delete \; \
    && : # last line

# Clone WiSeConnect Wi-Fi and Bluetooth Software 2.12.0 (7dc7686)
RUN git clone --depth=1 --single-branch --branch=2.12.0 https://github.com/SiliconLabs/wiseconnect-wifi-bt-sdk.git /tmp/wiseconnect-wifi-bt-sdk \
    && cd /tmp/wiseconnect-wifi-bt-sdk \
    && rm -rf .git \
    && : # last line

# Clone the WiSeConnect SDK prerelease branch
RUN git clone --depth=1 --single-branch --branch=wiseconnect-2026.12 \
    https://github.com/SiliconLabsSoftware/wiseconnect-prerelease.git \
    /tmp/wifi_sdk \
    && cd /tmp/wifi_sdk \
    && rm -rf .git \
    && : # last line

# Setup SLT CLI (kept in the final image on PATH as /opt/silabs/slt/slt)
RUN set -x \
    && mkdir -p /tmp/slt_install /tmp/slt_cli_bin \
    && curl -fsSL https://www.silabs.com/documents/public/software/slt-cli-1.2.2-linux-x64.zip -o /tmp/slt.zip \
    && unzip -q /tmp/slt.zip -d /tmp/slt_install \
    && rm /tmp/slt.zip \
    && chmod +x /tmp/slt_install/slt \
    && cp -a /tmp/slt_install/slt /tmp/slt_cli_bin/slt \
    && : # last line

# Install packages via SLT (simplicity-sdk, wiseconnect, slc-cli, python) and copy to /tmp for final image.
#
# agents_md Jinja generation loads the SLT python apack via Jep. SLC discovers that
# apack through ~/.silabs/slt/apack_registry.json (+ local.json), not by scanning
# installs/archive alone. Copying only python-v* leaves generation broken with:
#   "python script did not properly register a template generator"
# which is the same failure Silabs documents as needing `slt install python`
# (that command regenerates the registry — bake the registry instead).
RUN set -x \
    && /tmp/slt_install/slt install slc-cli \
    && cp -a $(/tmp/slt_install/slt where slc-cli) /tmp/slc_cli \
    && : # last line

# Install Simplicity Commander via SLT
RUN set -x \
    && /tmp/slt_install/slt install commander \
    && mkdir -p /tmp/simplicity-commander \
    && cp -a $(/tmp/slt_install/slt where commander) /tmp/simplicity-commander/commander \
    && : # last line

# Install ARM GCC toolchain and Java via SLT
RUN set -x \
    && /tmp/slt_install/slt install gcc-arm-none-eabi \
    && cp -a $(/tmp/slt_install/slt where gcc-arm-none-eabi) /tmp/arm-gcc \
    && /tmp/slt_install/slt install java21 \
    && cp -a $(/tmp/slt_install/slt where java21) /tmp/java \
    && : # last line

# Stage 2: Final image for SDK compilation
FROM ghcr.io/project-chip/chip-build:${VERSION}

# Add Python requirements
ADD docker/matter_extension_dependencies/requirements.txt /tmp/requirements.txt

# Set environment variables for SDKs and tools
ENV GSDK_ROOT=/opt/silabs/simplicity_sdk/
ENV SISDK_ROOT=/opt/silabs/simplicity_sdk/
ENV WISECONNECT_SDK_ROOT=/opt/silabs/wiseconnect-wifi-bt-sdk/
ENV WIFI_SDK_ROOT=/opt/silabs/wifi_sdk/
ENV ARM_GCC_DIR=/opt/arm-gcc
ENV JAVA21_HOME=/opt/silabs/amazon-corretto-21.0.7.6.1-linux-x64
ENV PATH="${PATH}:/opt/silabs/slc_cli/"
ENV PATH="${PATH}:/opt/silabs/simplicity-commander/commander"
ENV PATH="${PATH}:${ARM_GCC_DIR}/bin"
ENV PATH="${PATH}:${JAVA21_HOME}/bin"
ENV POST_BUILD_EXE=/opt/silabs/simplicity-commander/commander/commander

# Copy SDKs and tools from build stage to final image
COPY --from=build /tmp/simplicity_sdk ${SISDK_ROOT}
COPY --from=build /tmp/wiseconnect-wifi-bt-sdk/ ${WISECONNECT_SDK_ROOT}
COPY --from=build /tmp/wifi_sdk ${WIFI_SDK_ROOT}
COPY --from=build /tmp/slc_cli /opt/silabs/slc_cli
COPY --from=build /tmp/simplicity-commander /opt/silabs/simplicity-commander
COPY --from=build /tmp/arm-gcc ${ARM_GCC_DIR}
COPY --from=build /tmp/java ${JAVA21_HOME}
